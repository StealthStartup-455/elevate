"use client";

import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import DisabledReason from "@/components/ui/DisabledReason";
import { deskHref, parseDay, shiftDay } from "../day";

// ‹ date › and Today in the Check-in header. The day lives in the URL
// (?date=), so a reload or a shared link shows the same day. A new day starts
// on page 1.
export default function DayNav({ day, today }: { day: string; today: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-1">
      <IconButton component={NextLink} href={deskHref(shiftDay(day, -1), today)} aria-label="Previous day" color="secondary" sx={{ lineHeight: 1 }}>
        ‹
      </IconButton>
      <TextField
        type="date"
        value={day}
        onChange={(e) => {
          // Cleared or half typed: stay where we are.
          if (e.target.value) router.push(deskHref(parseDay(e.target.value, today), today));
        }}
        slotProps={{ htmlInput: { max: today, "aria-label": "Day shown" } }}
      />
      {day < today ? (
        <IconButton component={NextLink} href={deskHref(shiftDay(day, 1), today)} aria-label="Next day" color="secondary" sx={{ lineHeight: 1 }}>
          ›
        </IconButton>
      ) : (
        <DisabledReason reason="This is today. Later days have no check-ins yet.">
          <IconButton aria-label="Next day" disabled sx={{ lineHeight: 1 }}>
            ›
          </IconButton>
        </DisabledReason>
      )}
      {day !== today && (
        <Link component={NextLink} href="/desk" sx={{ ml: 2 }}>
          Today
        </Link>
      )}
    </div>
  );
}
