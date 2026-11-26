"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import BarcodeCamera from "@/features/check-ins/components/BarcodeCamera";
import DisabledReason from "@/components/ui/DisabledReason";
import { recordCheckInGaveUp } from "@/features/metrics/actions";
import { blockerCodes, type CheckInSourceName, type CheckInTiming } from "@/features/metrics/timing";
import { useDeskDialogOpen } from "@/features/check-ins/desk-dialogs";
import { checkInClimber, findClimbersToCheckIn, giveDayPass } from "../actions";
import { formatDate, membershipDateLine } from "../format";
import { isStudentId, normalizeStudentId } from "../student-id";
import type { CheckInCandidate, MembershipStatus } from "../types";
import LinkButton from "./LinkButton";
import WaiverBadge from "./WaiverBadge";

const OFFLINE = "Couldn't reach the server. Check the connection and try again.";

export type { CheckInCandidate };

// Wait this long after the last keystroke before searching (#85).
const SEARCH_DELAY_MS = 200;

const MEMBERSHIP_LABEL: Record<MembershipStatus, string> = {
  none: "No membership",
  active: "Active",
  paused: "Paused",
  expired: "Expired",
};

function membershipDetail(c: CheckInCandidate): string | null {
  if (c.hasDayPass && c.membershipStatus !== "active") return "Day pass for today";
  if (c.punchesLeft > 0 && c.membershipStatus !== "active") {
    return `${c.punchesLeft} ${c.punchesLeft === 1 ? "punch" : "punches"} left`;
  }
  return membershipDateLine(c.membershipStatus, c.membershipRenewsOn, c.membershipRecurring);
}

// Why this climber can't be checked in yet, or null when they can.
function blocker(c: CheckInCandidate): string | null {
  const problems: string[] = [];
  if (c.waiverStatus !== "valid") problems.push("needs a valid waiver");
  if (c.membershipStatus !== "active" && !c.hasDayPass && c.punchesLeft === 0) {
    problems.push("has no active membership, day pass or punch card");
  }
  return problems.length ? `${c.name} ${problems.join(" and ")}.` : null;
}

// STOPGAP(#62): a climber who can be let in with a free day pass: valid
// waiver, no active membership, no pass yet today. Replace with #44 to #46.
function canGiveDayPass(c: CheckInCandidate): boolean {
  return (
    c.waiverStatus === "valid" &&
    c.membershipStatus !== "active" &&
    !c.hasDayPass &&
    c.punchesLeft === 0
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

// Front desk "Check in" (it was "Manual check in" before the barcode scanner,
// #38): find a climber by scanning their barcode with the camera, or by
// typing a name, phone number or V number with fuzzy search, see their
// membership and waiver, and check them in, all in one dialog. The search runs
// on the server as staff type, so the page never carries every climber (#85).
export default function ManualCheckIn() {
  const [open, setOpen] = useState(false);
  // The scan popup waits while this is open, so dialogs never stack (#92).
  useDeskDialogOpen(open);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CheckInCandidate[]>([]);
  // The query the current results are for, so "No climbers match" only shows
  // once the search for what was typed has answered.
  const [resultsFor, setResultsFor] = useState("");
  const [selected, setSelected] = useState<CheckInCandidate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [scanNote, setScanNote] = useState<string | null>(null);
  const scanning = useRef(false);
  // For the value proposition metrics (#251): when the dialog opened, how the
  // climber was found, and what blocked them when picked. Sent with the check
  // in, or as "gave up" if the dialog closes without one.
  const openedAt = useRef(0);
  const foundRef = useRef<{ source: CheckInSourceName; blockers: string[] } | null>(null);

  function openDialog() {
    openedAt.current = performance.now();
    foundRef.current = null;
    setOpen(true);
  }

  function pick(c: CheckInCandidate, source: CheckInSourceName) {
    foundRef.current = { source, blockers: blockerCodes(c) };
    setSelected(c);
  }

  function timing(): CheckInTiming | undefined {
    if (!foundRef.current) return undefined;
    return {
      source: foundRef.current.source,
      elapsedMs: performance.now() - openedAt.current,
      wasBlocked: foundRef.current.blockers.length > 0,
      blockers: foundRef.current.blockers,
    };
  }

  useEffect(() => {
    const q = query.trim();
    if (q === "") return;
    let current = true;
    const timer = setTimeout(async () => {
      try {
        const found = await findClimbersToCheckIn(q);
        if (current) {
          setResults(found);
          setResultsFor(q);
        }
      } catch {
        if (current) setError("Couldn't search. Try again.");
      }
    }, SEARCH_DELAY_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query]);

  const searched = query.trim() !== "" && resultsFor === query.trim();

  // A barcode the camera read: straight to that climber's check in, or say why not.
  async function scanned(text: string) {
    const id = normalizeStudentId(text);
    if (scanning.current) return;
    if (!isStudentId(id)) {
      setScanNote("That isn't a student ID barcode.");
      return;
    }
    scanning.current = true;
    try {
      const match = (await findClimbersToCheckIn(id)).find((c) => c.studentId === id);
      if (match) {
        setScanNote(null);
        pick(match, "CAMERA");
      } else {
        setScanNote(`No climber has student ID ${id}.`);
      }
    } catch {
      setScanNote(OFFLINE);
    } finally {
      scanning.current = false;
    }
  }

  function close() {
    // Picked but not checked in: usually sent away by what blocked them.
    if (selected && !done) recordCheckInGaveUp(selected.id, timing()).catch(() => {});
    setOpen(false);
    // Reset after the closing animation so nothing flashes.
    setTimeout(() => {
      setQuery("");
      setResults([]);
      setResultsFor("");
      setSelected(null);
      setError(null);
      setDone(null);
      setScanNote(null);
    }, 200);
  }

  function checkIn(climber: CheckInCandidate) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await checkInClimber(climber.id, timing());
        if (result.ok) setDone(`${climber.name} is checked in.`);
        else setError(result.message ?? "Couldn't check in. Try again.");
      } catch {
        // Offline: say so here instead of the whole desk failing (#130).
        setError(OFFLINE);
      }
    });
  }

  function dayPass(climber: CheckInCandidate) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await giveDayPass(climber.id);
        if (result.ok) setSelected({ ...climber, hasDayPass: true });
        else setError(result.message ?? "Couldn't give a day pass. Try again.");
      } catch {
        setError(OFFLINE);
      }
    });
  }

  const blocked = selected ? blocker(selected) : null;

  return (
    <>
      <Button variant="outlined" onClick={openDialog} startIcon={<CameraIcon />}>
        Check in
      </Button>
      <Dialog
        open={open}
        onClose={close}
        fullWidth
        maxWidth="sm"
        aria-labelledby="check-in-title"
      >
        <DialogTitle id="check-in-title">Check in</DialogTitle>

        {done ? (
          <>
            <DialogContent>
              <Alert severity="success">{done}</Alert>
            </DialogContent>
            <DialogActions>
              <Button onClick={close}>Done</Button>
              <Button
                variant="contained"
                onClick={() => {
                  // The next climber's time starts now (#251).
                  openedAt.current = performance.now();
                  foundRef.current = null;
                  setDone(null);
                  setSelected(null);
                  setQuery("");
                  setResults([]);
                  setResultsFor("");
                }}
              >
                Check in someone else
              </Button>
            </DialogActions>
          </>
        ) : selected ? (
          <>
            <DialogContent>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
                {selected.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {personDetails(selected)}
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  columnGap: 4,
                  rowGap: 3,
                  alignItems: "center",
                  mt: 5,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Membership
                </Typography>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600 }}
                    color={selected.membershipStatus === "expired" ? "error" : undefined}
                  >
                    {selected.membershipStatus === "expired" ? "✕ " : ""}
                    {MEMBERSHIP_LABEL[selected.membershipStatus]}
                  </Typography>
                  {membershipDetail(selected) ? (
                    <Typography variant="caption" color={selected.membershipStatus === "expired" ? "error" : "text.secondary"}>
                      {membershipDetail(selected)}
                    </Typography>
                  ) : null}
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Waiver
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
                  <WaiverBadge status={selected.waiverStatus} />
                  {selected.waiverExpiresOn ? (
                    <Typography variant="caption" color="text.secondary">
                      {selected.waiverStatus === "valid" ? "Expires" : "Expired"}{" "}
                      {formatDate(selected.waiverExpiresOn, true)}
                    </Typography>
                  ) : null}
                </Box>
              </Box>

              {blocked ? (
                <Alert severity="warning" sx={{ mt: 5 }}>
                  {blocked}{" "}
                  <Link href={`/desk/customers/${selected.id}`}>Open their account</Link>
                </Alert>
              ) : null}
              {error ? (
                <Alert severity="error" sx={{ mt: 5 }}>
                  {error}
                </Alert>
              ) : null}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setSelected(null);
                  setError(null);
                }}
              >
                Back to search
              </Button>
              {selected.posEnabled ? (
                <LinkButton href={`/desk/pos?climber=${selected.id}`} variant="outlined" color="error" onClick={close}>
                  POS
                </LinkButton>
              ) : (
                <DisabledReason reason="This gym doesn't sell passes in Elevate.">
                  <Button variant="outlined" color="error" disabled>
                    POS
                  </Button>
                </DisabledReason>
              )}
              {canGiveDayPass(selected) ? (
                <Button variant="outlined" disabled={pending} onClick={() => dayPass(selected)}>
                  Give free day pass
                </Button>
              ) : null}
              <Button
                variant="contained"
                disabled={pending || blocked !== null}
                onClick={() => checkIn(selected)}
              >
                {pending ? "Checking in…" : "Manually check in"}
              </Button>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogContent>
              <Typography variant="secondary" component="p" sx={{ mb: 3 }}>
                Hold the climber&apos;s barcode up to the camera, or search below.
              </Typography>
              <BarcodeCamera onRead={scanned} />
              {scanNote ? (
                <Alert severity="error" sx={{ mt: 3 }} role="status">
                  {scanNote}
                </Alert>
              ) : null}
              <TextField
                autoFocus
                fullWidth
                type="search"
                label="Search name, phone or V number"
                placeholder="Typos are OK"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setScanNote(null);
                }}
                sx={{ mt: 3 }}
              />
              {error ? (
                <Alert severity="error" sx={{ mt: 4 }}>
                  {error}
                </Alert>
              ) : null}
              {query.trim() === "" ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
                  Start typing to find a climber.
                </Typography>
              ) : !searched ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
                  Searching…
                </Typography>
              ) : results.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
                  No climbers match.
                </Typography>
              ) : (
                <List aria-label="Matching climbers" sx={{ mt: 2 }}>
                  {results.map((c) => (
                    <ListItemButton key={c.id} onClick={() => pick(c, "SEARCH")}>
                      <ListItemText primary={c.name} secondary={personDetails(c)} />
                      <WaiverBadge status={c.waiverStatus} />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={close}>Cancel</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}

// Student ID, phone and birthday, so two climbers with the same name can be told apart (#129, #38).
function personDetails(c: CheckInCandidate): string {
  return [c.studentId ?? "", c.phone, c.dateOfBirth ? `Born ${formatDate(c.dateOfBirth, true)}` : ""]
    .filter(Boolean)
    .join(" · ");
}
