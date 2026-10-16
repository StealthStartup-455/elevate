"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import type { MembershipStatus, WaiverStatus } from "@/features/climbers/types";
import { recordScan } from "../actions";

// Demo only: pretends the desk scanner just read this climber's QR code.
const PROCESSING_MS = 3000;

type Props = {
  waiverStatus: WaiverStatus;
  membershipStatus: MembershipStatus;
};

// What the climber still needs to sort out, or an empty list if nothing.
function problems({ waiverStatus, membershipStatus }: Props): string[] {
  const list: string[] = [];
  if (waiverStatus === "missing") list.push("You haven't signed a waiver yet.");
  if (waiverStatus === "expired") list.push("Your waiver has expired.");
  if (membershipStatus === "none") list.push("You don't have a membership yet.");
  if (membershipStatus === "expired") list.push("Your membership has expired.");
  if (membershipStatus === "paused") list.push("Your membership is paused.");
  return list;
}

export default function ScanButton(props: Props) {
  const [step, setStep] = useState<"idle" | "processing" | "done" | "error">("idle");
  const issues = problems(props);

  // After the spinner has shown for 3 seconds, tell the server about the
  // scan, then show the result dialog.
  useEffect(() => {
    if (step !== "processing") return;
    const timer = setTimeout(async () => {
      const result = await recordScan();
      setStep(result.ok ? "done" : "error");
    }, PROCESSING_MS);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <>
      <Button
        variant="contained"
        size="small"
        onClick={() => setStep("processing")}
        disabled={step === "processing"}
        sx={{ mt: 1 }}
      >
        {step === "processing" ? (
          <CircularProgress size={18} color="inherit" aria-label="Processing" />
        ) : (
          "Demo Scan"
        )}
      </Button>

      <Dialog open={step === "error"} onClose={() => setStep("idle")}>
        <DialogTitle>Couldn&apos;t scan</DialogTitle>
        <DialogContent>
          <Alert severity="error">Something went wrong. Please log in again and try once more.</Alert>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setStep("idle")}>
            Back to menu
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={step === "done"} onClose={() => setStep("idle")}>
        <DialogTitle>{issues.length ? "Scanned, but…" : "Scanned!"}</DialogTitle>
        <DialogContent>
          {issues.length ? (
            <Alert severity="warning">
              {issues.map((text) => (
                <div key={text}>{text}</div>
              ))}
              <div>Please see the front desk before climbing.</div>
            </Alert>
          ) : (
            <Typography>The front desk can see you now. Have a good climb!</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setStep("idle")}>
            Back to menu
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
