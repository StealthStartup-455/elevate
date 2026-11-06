"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import DisabledReason from "@/components/ui/DisabledReason";
import StatusPill from "@/components/ui/StatusPill";
import { cancelClassBooking, signUpForClass } from "../actions";
import type { ClassItem } from "../queries";

const OFFLINE = "Couldn't reach the gym. Check your connection and try again.";

// The climber's classes, one card each with a date block. Each card signs up or cancels on its
// own; the action refreshes the page, so the places left update straight away.
export default function ClassList({ classes }: { classes: ClassItem[] }) {
  return (
    <ul aria-label="Classes" className="m-0 flex list-none flex-col gap-3 p-0">
      {classes.map((item) => (
        <ClassRow key={item.id} item={item} />
      ))}
    </ul>
  );
}

function ClassRow({ item }: { item: ClassItem }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: (classId: string) => ReturnType<typeof signUpForClass>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action(item.id);
        if (!result.ok) setError(result.message);
      } catch {
        setError(OFFLINE);
      }
    });
  }

  const about = [item.time, item.instructor ? `with ${item.instructor}` : null].filter(Boolean).join(" · ");
  const few = item.spotsLeft > 0 && item.spotsLeft <= 3;

  return (
    <Box
      component="li"
      data-testid="class-row"
      sx={{ bgcolor: "background.paper", borderRadius: 5, p: 4, display: "flex", flexDirection: "column", gap: 3 }}
    >
      <div className="flex gap-4">
        <Box
          aria-hidden="true"
          sx={{
            width: 56,
            flexShrink: 0,
            alignSelf: "flex-start",
            borderRadius: 3.5,
            bgcolor: "background.default",
            py: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography variant="label" sx={{ color: "text.secondary" }}>
            {item.weekday}
          </Typography>
          <Typography variant="cardTitle" component="span" sx={{ fontSize: "1.5rem", lineHeight: 1.1 }}>
            {item.dayOfMonth}
          </Typography>
        </Box>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Typography variant="body" component="h2" sx={{ fontWeight: 800, fontSize: "1.125rem", lineHeight: 1.3 }}>
            {item.title}
          </Typography>
          {/* The full date for screen readers, since the date block is hidden from them. */}
          <Typography variant="secondary">
            <span className="sr-only">{item.when}. </span>
            <span aria-hidden="true">{about}</span>
          </Typography>
          {item.details ? <Typography variant="secondary">{item.details}</Typography> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {item.canceled ? (
          <StatusPill status="bad" label="Canceled" />
        ) : item.booked ? (
          <StatusPill status="ok" label="You're in" />
        ) : (
          <Typography
            variant="body"
            component="span"
            sx={{ fontWeight: 700, color: item.spotsLeft === 0 ? "error.main" : few ? "warning.main" : "text.secondary" }}
          >
            {item.spots}
          </Typography>
        )}
        {item.canceled ? null : item.booked ? (
          <Button variant="outlined" disabled={pending} onClick={() => run(cancelClassBooking)} aria-label={`Cancel sign-up for ${item.title}`}>
            {pending ? "Cancelling…" : "Cancel sign-up"}
          </Button>
        ) : item.spotsLeft === 0 ? (
          <DisabledReason reason="Every place is taken">
            <Button variant="contained" disabled>
              Sign up
            </Button>
          </DisabledReason>
        ) : (
          <Button variant="contained" disabled={pending} onClick={() => run(signUpForClass)}>
            {pending ? "Signing up…" : "Sign up"}
          </Button>
        )}
      </div>
      {error ? <Alert severity="error">{error}</Alert> : null}
    </Box>
  );
}
