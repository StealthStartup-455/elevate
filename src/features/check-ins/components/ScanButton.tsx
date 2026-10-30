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
import { climberScanMessages } from "../scan-messages";

// Demo only: stands in for the desk's scanner reading this climber's QR code,
// and says so (#94). In a gym a USB scanner or a tablet camera at the desk
// reads the code; the climber's phone doesn't send anything.
const PROCESSING_MS = 3000;

type Props = {
  waiverStatus: WaiverStatus;
  membershipStatus: MembershipStatus;
  hasDayPass: boolean;
  punchesLeft: number;
};

export default function ScanButton(props: Props) {
  const [step, setStep] = useState<"idle" | "processing" | "done" | "error" | "offline">("idle");
  const issues = climberScanMessages(props);

  // After the spinner has shown for 3 seconds, tell the server about the
  // scan, then show the result dialog.
  useEffect(() => {
    if (step !== "processing") return;
    const timer = setTimeout(async () => {
      try {
        const result = await recordScan();
        setStep(result.ok ? "done" : "error");
      } catch {
        // Offline or the server didn't answer: say so, rather than let the
        // whole page fail (#130).
        setStep("offline");
      }
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
          "Simulate scan"
        )}
      </Button>
      {/* width 0 + minWidth 100%: wraps to the QR code's width instead of widening the column. */}
      <Typography variant="secondary" component="p" sx={{ mt: 1, width: 0, minWidth: "100%" }}>
        Demo only: at the gym, the desk scans your code.
      </Typography>

      <Dialog open={step === "error" || step === "offline"} onClose={() => setStep("idle")}>
        <DialogTitle>Couldn&apos;t scan</DialogTitle>
        <DialogContent>
          <Alert severity="error">
            {step === "offline"
              ? "Couldn't reach the gym. Check your connection and try again."
              : "Something went wrong. Please log in again and try once more."}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setStep("idle")}>
            Back to menu
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={step === "done"} onClose={() => setStep("idle")}>
        {/* "Sent", not "the desk can see you": the phone can't know whether
            staff have seen it yet (#127). */}
        <DialogTitle>Sent to the desk</DialogTitle>
        <DialogContent>
          {issues.length ? (
            // Info, not a warning: nothing here is the climber's fault (#90).
            <Alert severity="info">
              {issues.map((text) => (
                <div key={text}>{text}</div>
              ))}
              <div>Please stop by the desk before you climb.</div>
            </Alert>
          ) : (
            <Typography>The desk will check you in. Have a good climb!</Typography>
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
