"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import { useDeskDialogOpen } from "@/features/check-ins/desk-dialogs";
import { readDeskWaiver } from "../actions";
import type { SignedWaiverView } from "../queries";
import SignedWaiverDetails from "./SignedWaiverDetails";

type Loaded = { waiver: SignedWaiverView; timeZone: string };

// "Look at waiver" for staff (#147, #214): opens the signed waiver in a dialog,
// so they stay on the climber they were looking at. Reads it when opened.
export default function DeskWaiverDialog({ waiverId }: { waiverId: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // A QR scan waits until desk dialogs close, as with the POS ones.
  useDeskDialogOpen(open);

  function show() {
    setOpen(true);
    setError(null);
    setLoaded(null);
    startTransition(async () => {
      try {
        const result = await readDeskWaiver(waiverId);
        if (result) setLoaded(result);
        else setError("Couldn't open this waiver.");
      } catch {
        setError("Couldn't reach the server. Check the connection and try again.");
      }
    });
  }

  return (
    <>
      <Button variant="outlined" size="small" onClick={show}>
        Look at waiver
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" aria-labelledby="desk-waiver-title" scroll="paper">
        <DialogTitle id="desk-waiver-title">Signed waiver</DialogTitle>
        <DialogContent className="flex flex-col gap-3">
          {loaded ? (
            <SignedWaiverDetails waiver={loaded.waiver} timeZone={loaded.timeZone} />
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <Typography variant="secondary" role="status">
              {pending ? "Loading waiver…" : ""}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          {loaded ? (
            <Button variant="outlined" href={`/desk/waivers/${loaded.waiver.id}/pdf`}>
              Download PDF
            </Button>
          ) : null}
          <Button variant="contained" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
