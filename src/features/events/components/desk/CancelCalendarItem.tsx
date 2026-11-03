"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useId, useState, useTransition } from "react";
import { useDeskDialogOpen } from "@/features/check-ins/desk-dialogs";
import { cancelCalendarItem, removeSpecialHours, type CalendarKind } from "../../actions";

const OFFLINE = "Couldn't reach the server. Check the connection and try again.";

const COPY: Record<CalendarKind | "specialDay", { action: string; keep: string; explain: string }> = {
  event: {
    action: "Cancel event",
    keep: "Keep event",
    explain: "Climbers see it marked canceled at the top of their dashboard until the day it was planned for.",
  },
  setChange: {
    action: "Cancel set change",
    keep: "Keep set change",
    explain: "It comes off the climbers' set changes list.",
  },
  class: {
    action: "Cancel class",
    keep: "Keep class",
    explain: "Climbers who signed up see it marked canceled. Nobody else can sign up.",
  },
  specialDay: {
    action: "Remove day",
    keep: "Keep day",
    explain: "The regular hours apply to that day again.",
  },
};

// Cancels an event, set change or class, or removes a special day, after a
// confirm. Nothing is deleted: the row is marked, so climbers can be told.
export default function CancelCalendarItem({
  kind,
  id,
  name,
}: {
  kind: CalendarKind | "specialDay";
  id: string;
  /** What is being cancelled, for the confirm: "Climbing film night". */
  name: string;
}) {
  const copy = COPY[kind];
  const [open, setOpen] = useState(false);
  // Hold the scan popup while confirming (#92, #127).
  useDeskDialogOpen(open);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const titleId = useId();

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        const result = kind === "specialDay" ? await removeSpecialHours(id) : await cancelCalendarItem(kind, id);
        if (result.ok) setOpen(false);
        else setError(result.message);
      } catch {
        setError(OFFLINE);
      }
    });
  }

  return (
    <>
      <Button variant="outlined" color="error" size="small" onClick={() => setOpen(true)} aria-label={`${copy.action}: ${name}`}>
        {copy.action}
      </Button>
      <Dialog open={open} onClose={close} fullWidth maxWidth="xs" aria-labelledby={titleId}>
        <DialogTitle id={titleId}>{copy.action}</DialogTitle>
        <DialogContent className="flex flex-col gap-3">
          <Typography variant="body">{copy.action}: {name}?</Typography>
          <Typography variant="secondary">{copy.explain}</Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
        </DialogContent>
        <DialogActions>
          <Button disabled={pending} onClick={close}>
            {copy.keep}
          </Button>
          <Button variant="contained" color="error" disabled={pending} onClick={confirm}>
            {pending ? "Saving…" : copy.action}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
