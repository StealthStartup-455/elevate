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
import { checkInClimber, giveDayPass, signWaiver } from "@/features/climbers/actions";
import WaiverBadge from "@/features/climbers/components/WaiverBadge";
import { formatDate } from "@/features/climbers/format";
import type { MembershipStatus } from "@/features/climbers/types";
import {
  finishDeskScan,
  isDeskScanWaiting,
  nextDeskScan,
  type ScannedClimber,
} from "../actions";
import { useOtherDeskDialogOpen } from "../desk-dialogs";
import { deskNextStep } from "../scan-messages";

// How often the desk asks the server for a new scan. Short, so the popup
// shows up right after the climber taps "Simulate scan".
const POLL_MS = 2500;

const OFFLINE = "Couldn't reach the server. Check the connection and try again.";

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
  if (c.membershipStatus !== "active" && !c.hasDayPass && c.punchesLeft === 0) {
    list.push("has no active membership, day pass or punch card");
  }
  return list;
}

// STOPGAP(#62): valid waiver but nothing to get in with, so staff can give a
// free day pass. Replace with #44 to #46.
function canGiveDayPass(c: ScannedClimber): boolean {
  return (
    c.waiverStatus === "valid" &&
    c.membershipStatus !== "active" &&
    !c.hasDayPass &&
    c.punchesLeft === 0
  );
}

// Front desk: pops up the climber who just scanned on /me, with their
// membership and waiver. A warning when something is missing; otherwise a
// green button that checks them in with the same rules as manual check in.
//
// In the desk layout, so it runs on every desk page (Check-in, POS, Climbers),
// not only Check-in (#127). A scan stays waiting until staff check the person
// in or close the popup: a reload shows it again, and every open desk shows it
// until one of them deals with it.
export default function ScanWatcher() {
  const router = useRouter();
  const [scanId, setScanId] = useState<string | null>(null);
  const [climber, setClimber] = useState<ScannedClimber | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  // Another desk dialog (manual check in, POS checkout, void) is open: hold
  // scans until it closes, so two dialogs never stack (#92). They wait in
  // the database.
  const otherDialogOpen = useOtherDeskDialogOpen();

  // Look for a waiting scan while nothing is showing.
  useEffect(() => {
    if (scanId || otherDialogOpen) return;
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const next = await nextDeskScan();
        if (next) {
          setScanId(next.scanId);
          setClimber(next.climber);
        }
      } catch {
        // Offline or the server didn't answer: try again on the next tick.
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [scanId, otherDialogOpen]);

  // While showing a scan, close it if another desk deals with it first.
  useEffect(() => {
    if (!scanId || done) return;
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        if (!(await isDeskScanWaiting(scanId))) reset();
      } catch {
        // Offline: keep showing it.
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [scanId, done]);

  function reset() {
    setScanId(null);
    setClimber(null);
    setError(null);
    setDone(false);
  }

  // Closing deals with the scan, so it doesn't pop up again on any desk.
  function close() {
    const id = scanId;
    reset();
    if (id && !done) finishDeskScan(id, "closed").catch(() => {});
  }

  function checkIn(c: ScannedClimber) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await checkInClimber(c.id);
        if (result.ok) {
          setDone(true);
          if (scanId) await finishDeskScan(scanId, "checked_in").catch(() => {});
          router.refresh(); // update the check-in list and count
        } else {
          setError(result.message ?? "Couldn't check in. Try again.");
        }
      } catch {
        setError(OFFLINE);
      }
    });
  }

  // STOPGAP like the climber page's waiver step, until #35/#36: staff sign
  // for the climber right here, so the scan doesn't dead-end (#90, #131).
  function waiver(c: ScannedClimber) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await signWaiver(c.id);
        if (result.ok) {
          setClimber({ ...c, waiverStatus: "valid", waiverExpiresOn: undefined });
          router.refresh();
        } else {
          setError(result.message ?? "Couldn't sign the waiver. Try again.");
        }
      } catch {
        setError(OFFLINE);
      }
    });
  }

  function dayPass(c: ScannedClimber) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await giveDayPass(c.id);
        if (result.ok) setClimber({ ...c, hasDayPass: true });
        else setError(result.message ?? "Couldn't give a day pass. Try again.");
      } catch {
        setError(OFFLINE);
      }
    });
  }

  if (!climber) return null;
  const issues = problems(climber);
  const nextStep = deskNextStep(climber);

  return (
    <Dialog
      open
      // A stray click outside shouldn't dismiss an arrival; Close and Escape do.
      onClose={(_event, reason) => {
        if (reason !== "backdropClick") close();
      }}
      fullWidth
      maxWidth="xs"
    >
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
            <Typography
              variant="body2"
              sx={{ fontWeight: 600 }}
              color={climber.membershipStatus === "expired" ? "error" : undefined}
            >
              {climber.membershipStatus === "expired" ? "✕ " : ""}
              {MEMBERSHIP_LABEL[climber.membershipStatus]}
            </Typography>
            {climber.hasDayPass && climber.membershipStatus !== "active" ? (
              <Typography variant="caption" color="text.secondary">
                Day pass for today
              </Typography>
            ) : climber.punchesLeft > 0 && climber.membershipStatus !== "active" ? (
              <Typography variant="caption" color="text.secondary">
                {climber.punchesLeft} {climber.punchesLeft === 1 ? "punch" : "punches"} left
              </Typography>
            ) : climber.membershipRenewsOn ? (
              <Typography variant="caption" color={climber.membershipStatus === "expired" ? "error" : "text.secondary"}>
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

        {nextStep && !done ? (
          <Typography variant="body" component="p" sx={{ mt: 3 }}>
            {nextStep}
          </Typography>
        ) : null}
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
        {climber.waiverStatus !== "valid" ? (
          <Button variant="outlined" disabled={pending} onClick={() => waiver(climber)}>
            Sign waiver
          </Button>
        ) : null}
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
