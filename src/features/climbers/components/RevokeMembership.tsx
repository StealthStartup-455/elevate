"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import DisabledReason from "@/components/ui/DisabledReason";
import { useBackdropClose } from "@/components/ui/useBackdropClose";
import { useDeskDialogOpen } from "@/features/check-ins/desk-dialogs";
import { revokeMembership } from "@/features/pos/actions";

// Ends the climber's membership now, after a confirm with a reason (#241),
// saved so there's a record if the member asks. No money moves: to refund,
// staff void the sale under Today's sales. An account action, not a sale, so
// it's on the climber's page under Customers, for managers and owners only
// (#254). The page shows the revoke once the action refreshes it.
export default function RevokeMembership({ climberId, climberName }: { climberId: string; climberName: string }) {
  const [open, setOpen] = useState(false);
  // Hold the scan popup while revoking (#92, #127).
  useDeskDialogOpen(open);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    if (pending) return;
    setOpen(false);
    setReason("");
    setError(null);
  }

  // Outside clicks close it too, but not the second click of a double-click (#134, #218).
  const onClose = useBackdropClose(open, close);

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await revokeMembership(climberId, reason);
        if (result.ok) {
          setOpen(false);
          setReason("");
        } else setError(result.message ?? "Couldn't revoke the membership. Try again.");
      } catch {
        setError("Couldn't reach the server. Check the connection and try again.");
      }
    });
  }

  return (
    <>
      <div>
        <Button variant="outlined" color="error" size="small" onClick={() => setOpen(true)}>
          Revoke membership
        </Button>
      </div>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="revoke-title">
        <DialogTitle id="revoke-title">Revoke membership</DialogTitle>
        <DialogContent className="flex flex-col gap-3">
          <Typography variant="body">Revoke {climberName}&apos;s membership?</Typography>
          <Typography variant="secondary">
            It stops working now, along with any renewal already bought, and won&apos;t come up for renewal. No money
            is given back: to refund, void the sale under Today&apos;s sales on the POS.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Reason"
            placeholder="Couldn't pay this month"
            helperText="Saved on their file, so there's a record if they ask."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
        </DialogContent>
        <DialogActions>
          <Button disabled={pending} onClick={close}>
            Keep membership
          </Button>
          {reason.trim() === "" ? (
            <DisabledReason reason="Give a reason first">
              <Button variant="contained" color="error" disabled>
                Revoke membership
              </Button>
            </DisabledReason>
          ) : (
            <Button variant="contained" color="error" disabled={pending} onClick={confirm}>
              {pending ? "Revoking…" : "Revoke membership"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
