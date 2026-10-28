"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useEffect, useState } from "react";
import { signWaiver } from "../actions";

// STOPGAP, now used only on the desk climber page: climbers sign on
// /me/waiver (features/waivers). Staff "signing for" a climber goes once the
// desk has its own waiver flow (#35, #36). A short spinner, then the
// climber's waiver is marked as signed. It was 5
// seconds; now under one second in total, because the pitch is speed (#66).
// The spinner stays only so the step doesn't flash past.
const SPINNER_MS = 300;

type Props = {
  climberId: string;
  /** Show a Continue button to this page once the waiver is signed. */
  nextHref?: string;
};

export default function WaiverStep({ climberId, nextHref }: Props) {
  const [step, setStep] = useState<"idle" | "signing" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== "signing") return;
    // Mark the waiver signed only after the spinner, so the page behind this
    // step doesn't change (and unmount this) while it is still showing.
    const timer = setTimeout(async () => {
      const result = await signWaiver(climberId);
      if (result.ok) {
        setStep("done");
      } else {
        setError(result.message ?? "Couldn't sign the waiver. Try again.");
        setStep("idle");
      }
    }, SPINNER_MS);
    return () => clearTimeout(timer);
  }, [step, climberId]);

  if (step === "signing") {
    return (
      <Box
        role="status"
        aria-live="polite"
        sx={{ display: "flex", alignItems: "center", gap: 4, py: 2 }}
      >
        <CircularProgress size={24} aria-hidden="true" />
        <Typography>Preparing your waiver…</Typography>
      </Box>
    );
  }

  if (step === "done") {
    return (
      <Stack spacing={4}>
        <Alert severity="success">Waiver signed.</Alert>
        {nextHref ? (
          <Button component={Link} href={nextHref} variant="contained" size="large">
            Continue
          </Button>
        ) : null}
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Button
        type="button"
        variant="contained"
        size="large"
        onClick={() => {
          setError(null);
          setStep("signing");
        }}
      >
        Sign a waiver now
      </Button>
    </Stack>
  );
}
