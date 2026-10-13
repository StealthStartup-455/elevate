"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useEffect, useState } from "react";

// Placeholder for the real waiver signing flow (waivers feature).
const SPINNER_MS = 5000;
// TODO: the page after waiver signing is still to be decided. The member
// dashboard shows the waiver status, so it is the stand-in for now.
const NEXT_PATH = "/me";

export default function WaiverStep() {
  const [step, setStep] = useState<"idle" | "signing" | "done">("idle");

  useEffect(() => {
    if (step !== "signing") return;
    const timer = setTimeout(() => setStep("done"), SPINNER_MS);
    return () => clearTimeout(timer);
  }, [step]);

  if (step === "signing") {
    return (
      <Box
        role="status"
        aria-live="polite"
        sx={{ display: "flex", alignItems: "center", gap: 2, py: 1 }}
      >
        <CircularProgress size={24} aria-hidden="true" />
        <Typography>Preparing your waiver…</Typography>
      </Box>
    );
  }

  if (step === "done") {
    return (
      <Stack spacing={2}>
        <Alert severity="success">Waiver step complete.</Alert>
        <Button component={Link} href={NEXT_PATH} variant="contained" size="large">
          Continue
        </Button>
      </Stack>
    );
  }

  return (
    <Button
      type="button"
      variant="contained"
      size="large"
      onClick={() => setStep("signing")}
    >
      Sign a waiver now
    </Button>
  );
}
