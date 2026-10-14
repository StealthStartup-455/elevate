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
import { useMemo, useState, useTransition } from "react";
import { checkInClimber } from "../actions";
import { formatDate } from "../format";
import type { MembershipStatus, WaiverStatus } from "../types";
import { searchScore } from "./ClimberTable";
import WaiverBadge from "./WaiverBadge";

export type CheckInCandidate = {
  id: string;
  name: string;
  phone: string;
  waiverStatus: WaiverStatus;
  waiverExpiresOn?: string;
  membershipStatus: MembershipStatus;
  membershipRenewsOn?: string;
};

const MAX_RESULTS = 8;

const MEMBERSHIP_LABEL: Record<MembershipStatus, string> = {
  none: "No membership",
  active: "Active",
  paused: "Paused",
  expired: "Expired",
};

function membershipDetail(c: CheckInCandidate): string | null {
  if (!c.membershipRenewsOn) return null;
  const date = formatDate(c.membershipRenewsOn, true);
  if (c.membershipStatus === "expired") return `Ended ${date}`;
  return `Renews ${date}`;
}

// Why this climber can't be checked in yet, or null when they can.
function blocker(c: CheckInCandidate): string | null {
  const problems: string[] = [];
  if (c.waiverStatus !== "valid") problems.push("needs a valid waiver");
  if (c.membershipStatus !== "active") problems.push("has no active membership");
  return problems.length ? `${c.name} ${problems.join(" and ")}.` : null;
}

// Front desk "Manual check in": find a climber with fuzzy search, see their
// membership and waiver, and check them in, all in one dialog.
export default function ManualCheckIn({
  climbers,
}: {
  climbers: CheckInCandidate[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = climbers.find((c) => c.id === selectedId) ?? null;

  const results = useMemo(() => {
    if (query.trim() === "") return [];
    return climbers
      .map((row) => ({ row, score: searchScore(row, query) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map(({ row }) => row);
  }, [climbers, query]);

  function close() {
    setOpen(false);
    // Reset after the closing animation so nothing flashes.
    setTimeout(() => {
      setQuery("");
      setSelectedId(null);
      setError(null);
      setDone(null);
    }, 200);
  }

  function checkIn(climber: CheckInCandidate) {
    setError(null);
    startTransition(async () => {
      const result = await checkInClimber(climber.id);
      if (result.ok) setDone(`${climber.name} is checked in.`);
      else setError(result.message ?? "Couldn't check in. Try again.");
    });
  }

  const blocked = selected ? blocker(selected) : null;

  return (
    <>
      <Button variant="outlined" onClick={() => setOpen(true)}>
        Manual check in
      </Button>
      <Dialog
        open={open}
        onClose={close}
        fullWidth
        maxWidth="sm"
        aria-labelledby="manual-check-in-title"
      >
        <DialogTitle id="manual-check-in-title">Manual check in</DialogTitle>

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
                  setDone(null);
                  setSelectedId(null);
                  setQuery("");
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
              {selected.phone ? (
                <Typography variant="body2" color="text.secondary">
                  {selected.phone}
                </Typography>
              ) : null}

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  columnGap: 2,
                  rowGap: 1.5,
                  alignItems: "center",
                  mt: 2.5,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Membership
                </Typography>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {MEMBERSHIP_LABEL[selected.membershipStatus]}
                  </Typography>
                  {membershipDetail(selected) ? (
                    <Typography variant="caption" color="text.secondary">
                      {membershipDetail(selected)}
                    </Typography>
                  ) : null}
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Waiver
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
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
                <Alert severity="warning" sx={{ mt: 2.5 }}>
                  {blocked}{" "}
                  <Link href={`/desk/climbers/${selected.id}`}>Open their account</Link>
                </Alert>
              ) : null}
              {error ? (
                <Alert severity="error" sx={{ mt: 2.5 }}>
                  {error}
                </Alert>
              ) : null}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setSelectedId(null);
                  setError(null);
                }}
              >
                Back to search
              </Button>
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
              <TextField
                autoFocus
                fullWidth
                type="search"
                label="Search name or phone"
                placeholder="Typos are OK"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ mt: 0.5 }}
              />
              {query.trim() === "" ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Start typing to find a climber.
                </Typography>
              ) : results.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  No climbers match.
                </Typography>
              ) : (
                <List aria-label="Matching climbers" sx={{ mt: 1 }}>
                  {results.map((c) => (
                    <ListItemButton key={c.id} onClick={() => setSelectedId(c.id)}>
                      <ListItemText primary={c.name} secondary={c.phone} />
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
