"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { checkInClimber, giveDayPass } from "@/features/climbers/actions";
import WaiverBadge from "@/features/climbers/components/WaiverBadge";
import { formatDate } from "@/features/climbers/format";
import type { MembershipStatus } from "@/features/climbers/types";
import { startWatchingScans, takeLatestScan, type ScannedClimber } from "../actions";
import { useOtherDeskDialogOpen } from "../desk-dialogs";

// How often the desk asks the server for a new scan. Short, so the popup
// shows up right after the climber taps "Simulate scan".
const POLL_MS = 2500;

const MEMBERSHIP_LABEL: Record<MembershipStatus, string> = {
  none: "No membership",
  active: "Active",
  paused: "Paused",
  expired: "Expired",
};

// What stops this climber from checking in, or an empty list if nothing.
function problems(c: ScannedClimber): string[] {
  const list: string[] = [];
  if (c.waiverStatus !== "valid") list.push("needs a valid waiver");
  if (c.membershipStatus !== "active" && !c.hasDayPass) {
    list.push("has no active membership or day pass");
  }
  return list;
}

// STOPGAP(#62): valid waiver but nothing to get in with, so staff can give a
// free day pass. Replace with #44 to #46.
function canGiveDayPass(c: ScannedClimber): boolean {
  return c.waiverStatus === "valid" && c.membershipStatus !== "active" && !c.hasDayPass;
}

// Front desk: pops up the climber who just scanned on /me, with their
// membership and waiver. A warning when something is missing; otherwise a
// green button that checks them in with the same rules as manual check in.
export default function ScanWatcher() {
  const router = useRouter();
  const [climber, setClimber] = useState<ScannedClimber | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  // When this desk started watching (server time). Scans from before then are
  // never shown, so opening the desk doesn't pop up an old scan (#91).
  const [watchingSince, setWatchingSince] = useState<string | null>(null);
  // Another desk dialog (manual check in) is open: hold scans until it
  // closes, so two dialogs never stack (#92). They wait in the database.
  const otherDialogOpen = useOtherDeskDialogOpen();

  useEffect(() => {
    let active = true;
    startWatchingScans().then((at) => {
      if (active) setWatchingSince(at);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // Don't look for a new scan before the desk knows when it started, while
    // one is already showing, or while another dialog is open.
    if (!watchingSince || climber || otherDialogOpen) return;
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const scanned = await takeLatestScan(watchingSince);
      if (scanned) setClimber(scanned);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [climber, otherDialogOpen, watchingSince]);

  function close() {
    setClimber(null);
    setError(null);
    setDone(false);
  }

  function checkIn(c: ScannedClimber) {
    setError(null);
    startTransition(async () => {
      const result = await checkInClimber(c.id);
      if (result.ok) {
        setDone(true);
        router.refresh(); // update the check-in list and count
      } else {
        setError(result.message ?? "Couldn't check in. Try again.");
      }
    });
  }

  function dayPass(c: ScannedClimber) {
    setError(null);
    startTransition(async () => {
      const result = await giveDayPass(c.id);
      if (result.ok) setClimber({ ...c, hasDayPass: true });
      else setError(result.message ?? "Couldn't give a day pass. Try again.");
    });
  }

  if (!climber) return null;
  const issues = problems(climber);

  return (
    <Dialog open onClose={close} fullWidth maxWidth="xs">
      {issues.length ? (
        <Alert severity="warning" variant="filled" sx={{ borderRadius: 0 }}>
          {climber.name} {issues.join(" and ")}.
        </Alert>
      ) : null}
      <DialogTitle>QR scan</DialogTitle>
      <DialogContent>
        <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
          {climber.name}
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            columnGap: 2,
            rowGap: 1.5,
            alignItems: "center",
            mt: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Membership
          </Typography>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {MEMBERSHIP_LABEL[climber.membershipStatus]}
            </Typography>
            {climber.hasDayPass && climber.membershipStatus !== "active" ? (
              <Typography variant="caption" color="text.secondary">
                Free day pass for today
              </Typography>
            ) : climber.membershipRenewsOn ? (
              <Typography variant="caption" color="text.secondary">
                {climber.membershipStatus === "expired" ? "Ended" : "Renews"}{" "}
                {formatDate(climber.membershipRenewsOn, true)}
              </Typography>
            ) : null}
          </Box>

          <Typography variant="body2" color="text.secondary">
            Waiver
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            <WaiverBadge status={climber.waiverStatus} />
            {climber.waiverExpiresOn ? (
              <Typography variant="caption" color="text.secondary">
                {climber.waiverStatus === "valid" ? "Expires" : "Expired"}{" "}
                {formatDate(climber.waiverExpiresOn, true)}
              </Typography>
            ) : null}
          </Box>
        </Box>

        {done ? (
          <Alert severity="success" sx={{ mt: 2.5 }}>
            {climber.name} is checked in.
          </Alert>
        ) : null}
        {error ? (
          <Alert severity="error" sx={{ mt: 2.5 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Close</Button>
        {canGiveDayPass(climber) ? (
          <Button variant="outlined" disabled={pending} onClick={() => dayPass(climber)}>
            Give free day pass
          </Button>
        ) : null}
        {issues.length === 0 && !done ? (
          <Button
            variant="contained"
            color="success"
            disabled={pending}
            onClick={() => checkIn(climber)}
          >
            {pending ? "Checking in…" : "Check in"}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
