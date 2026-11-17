"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import StatusPill from "@/components/ui/StatusPill";
import { finishDeskScan, waitingDeskScans, type DeskScan } from "../actions";
import { playScanSound } from "../scan-sound";
import { initials, newArrivals, scanResult } from "../scan-toast";

// Front desk arrivals (#225). When a climber scans on /me, every open desk
// shows a small toast in the top-right corner with their name, picture (or
// initials) and whether they're ready to check in, plus a ding or a buzz.
// The toast never opens a dialog, takes focus or changes what staff are doing,
// and it goes away after 10 seconds or when dismissed.
//
// Dismissing a toast only hides it. The scan keeps waiting in the database
// (#127) and stays in the nav's Arrivals list until staff check the
// climber in (checkInClimber clears it on every desk) or clear it there.
// In the desk layout's nav, so it runs on every desk page.

const POLL_MS = 2500;
const TOAST_MS = 10_000;
// A rush shows the newest few; the rest wait in Arrivals.
const MAX_TOASTS = 3;
// Scans this browser tab has already announced, so a reload doesn't ding again.
const SEEN_KEY = "elevate.desk.seenScans";

function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-100)));
  } catch {
    // Storage blocked: the worst case is one repeat toast after a reload.
  }
}

export default function DeskArrivals() {
  const router = useRouter();
  const [waiting, setWaiting] = useState<DeskScan[]>([]);
  const [toasts, setToasts] = useState<string[]>([]); // scan ids, oldest first
  const [listAnchor, setListAnchor] = useState<HTMLElement | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Closes by itself once nobody is waiting (the button goes too).
  const listOpen = !!listAnchor && waiting.length > 0;

  useEffect(() => {
    seen.current ??= loadSeen();
    let stopped = false;
    async function poll() {
      if (document.visibilityState !== "visible") return;
      try {
        const scans = await waitingDeskScans();
        if (stopped) return;
        setWaiting(scans);
        const fresh = newArrivals(scans, seen.current!);
        if (fresh.length === 0) return;
        for (const s of fresh) seen.current!.add(s.scanId);
        saveSeen(seen.current!);
        setToasts((t) => [...t, ...fresh.map((s) => s.scanId)]);
        // One sound per new arrival, spaced out so two arrivals are two sounds.
        fresh.forEach((s, i) =>
          playScanSound(scanResult(s.climber).ready ? "ding" : "buzz", i * 0.6),
        );
      } catch {
        // Offline or the server didn't answer: try again on the next tick.
      }
    }
    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  // Nobody waiting: forget the list's anchor so the next arrival's toast shows.
  if (listAnchor && waiting.length === 0) setListAnchor(null);

  function dismiss(scanId: string) {
    setToasts((t) => t.filter((id) => id !== scanId));
  }

  function open(scan: DeskScan) {
    dismiss(scan.scanId);
    setListAnchor(null);
    router.push(`/desk?climber=${scan.climber.id}`);
  }

  // Clearing from Arrivals deals with the scan on every desk, like the old Close.
  function clear(scan: DeskScan) {
    dismiss(scan.scanId);
    setWaiting((w) => w.filter((s) => s.scanId !== scan.scanId));
    // The Clear button just pressed goes away: keep the keyboard in the list,
    // so Tab and Escape still work.
    listRef.current?.focus();
    finishDeskScan(scan.scanId, "closed").catch(() => {});
  }

  // A toast whose scan was dealt with (checked in here or on another desk) goes.
  // Hidden while the Arrivals list is open: the list already shows everyone,
  // and the toasts would sit on top of it.
  const shown = listOpen ? [] : toasts
    .map((id) => waiting.find((s) => s.scanId === id))
    .filter((s): s is DeskScan => !!s)
    .slice(-MAX_TOASTS);

  return (
    <>
      {/* Only while someone is waiting, so there's never a disabled button here. */}
      {waiting.length > 0 ? (
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          aria-haspopup="dialog"
          aria-expanded={listOpen}
          onClick={(e) => setListAnchor(e.currentTarget)}
        >
          Arrivals ({waiting.length})
        </Button>
      ) : null}
      <Popover
        anchorEl={listAnchor}
        open={listOpen}
        onClose={() => setListAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box component="ul" ref={listRef} tabIndex={-1} aria-label="Waiting arrivals" className="flex w-80 max-w-full flex-col gap-3 p-3">
          {waiting.map((scan) => {
            const result = scanResult(scan.climber);
            return (
              <Box component="li" key={scan.scanId} className="flex items-center gap-3">
                <Avatar alt="">{initials(scan.climber.name)}</Avatar>
                <Box className="flex min-w-0 flex-1 flex-col">
                  <Typography variant="body">{scan.climber.name}</Typography>
                  <Typography variant="secondary">{result.reasons[0] ?? result.label}</Typography>
                </Box>
                <Button size="small" variant="outlined" onClick={() => open(scan)}>
                  Open
                </Button>
                <Button size="small" variant="outlined" onClick={() => clear(scan)}>
                  Clear
                </Button>
              </Box>
            );
          })}
        </Box>
      </Popover>

      {/* Top right, under the nav bar so Arrivals and Log out stay reachable.
          Above the page, but not a dialog: nothing behind it is blocked. */}
      <Box
        className="fixed right-4 top-16 flex w-80 max-w-full flex-col gap-2"
        sx={{ zIndex: (theme) => theme.zIndex.snackbar }}
      >
        {shown.map((scan) => (
          <ArrivalToast
            key={scan.scanId}
            scan={scan}
            onOpen={() => open(scan)}
            onDismiss={() => dismiss(scan.scanId)}
          />
        ))}
      </Box>
    </>
  );
}

function ArrivalToast({
  scan,
  onOpen,
  onDismiss,
}: {
  scan: DeskScan;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const result = scanResult(scan.climber);
  const [paused, setPaused] = useState(false);
  // The parent re-renders on every poll with a new onDismiss. Reading it from
  // a ref keeps those re-renders from restarting the 10-second timer.
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  // Goes after 10 seconds, but not while the pointer or keyboard is on it.
  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => dismissRef.current(), TOAST_MS);
    return () => clearTimeout(id);
  }, [paused]);

  return (
    <Paper
      role="status"
      aria-live="polite"
      elevation={6}
      className="flex gap-3 p-3"
      sx={{
        borderLeft: 4,
        borderColor: result.ready ? "success.main" : "error.main",
      }}
      // Moving the pointer onto it pauses; a toast that appears under a
      // pointer resting there doesn't, or it would never go.
      onPointerMove={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* No profile photos yet: initials stand in, and the name is always written out. */}
      <Avatar alt="">{initials(scan.climber.name)}</Avatar>
      <Box className="flex min-w-0 flex-1 flex-col gap-1">
        <Typography variant="cardTitle" component="p">
          {scan.climber.name}
        </Typography>
        <Box>
          <StatusPill status={result.ready ? "ok" : "bad"} label={result.label} />
        </Box>
        {result.reasons.map((r) => (
          <Typography key={r} variant="body">
            {r}
          </Typography>
        ))}
        {result.nextStep ? <Typography variant="secondary">{result.nextStep}</Typography> : null}
        <Box className="mt-1">
          <Button size="small" variant="outlined" onClick={onOpen}>
            Open check-in
          </Button>
        </Box>
      </Box>
      <IconButton size="small" aria-label={`Dismiss ${scan.climber.name}`} onClick={onDismiss} className="self-start">
        <span aria-hidden="true">✕</span>
      </IconButton>
    </Paper>
  );
}
