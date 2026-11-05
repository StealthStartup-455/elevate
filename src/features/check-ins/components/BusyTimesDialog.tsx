"use client";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useState, type ReactNode } from "react";
import { useDeskDialogOpen } from "../desk-dialogs";

// "Busy times →" in the Check-in header: opens the typical-week heat map,
// which the page renders on the server and passes in as `children`.
export default function BusyTimesDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // The scan popup waits while this is open, so dialogs never stack (#92).
  useDeskDialogOpen(open);
  return (
    <>
      <Link
        component="button"
        type="button"
        onClick={() => setOpen(true)}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          whiteSpace: "nowrap",
          "& .arrow": { transition: "transform 120ms" },
          "&:hover .arrow": { transform: "translateX(2px)" },
        }}
      >
        Busy times
        <span className="arrow" aria-hidden="true">
          →
        </span>
      </Link>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth aria-labelledby="busy-times-title">
        <div className="flex items-center justify-between gap-2 pr-3">
          <DialogTitle id="busy-times-title">Busy times</DialogTitle>
          <IconButton aria-label="Close" onClick={() => setOpen(false)}>
            ✕
          </IconButton>
        </div>
        <DialogContent>
          <Typography variant="secondary" component="p" sx={{ mb: 4 }}>
            How busy the gym usually is, by day and hour.
          </Typography>
          {children}
        </DialogContent>
      </Dialog>
    </>
  );
}
