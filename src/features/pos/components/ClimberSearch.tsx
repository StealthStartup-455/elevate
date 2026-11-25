"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Paper from "@mui/material/Paper";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import StatusPill from "@/components/ui/StatusPill";
import { useDeskDialogOpen } from "@/features/check-ins/desk-dialogs";
import { formatDate } from "@/features/climbers/format";
import { findPosClimbers } from "../actions";
import type { PosClimber, RecentCheckIn, RenewalDue } from "../types";

// Wait for a pause in typing before searching, as Check in does.
const SEARCH_DELAY_MS = 200;

// The POS climber search (#240), on the same line as the page title. Clicking
// it drops a list down over the sale area, which blurs while it is open:
// fuzzy search on the server (#85),
// and, until staff type, today's check-ins and renewals due. Picking someone
// closes it, so the POS shows that climber unblurred.
export default function ClimberSearch({
  checkedInToday,
  renewalsDue,
  onSelect,
  onRenew,
  onOpenChange,
}: {
  checkedInToday: RecentCheckIn[];
  renewalsDue: RenewalDue[];
  onSelect: (climber: PosClimber | { id: string; name: string }) => void;
  onRenew: (renewal: RenewalDue) => void;
  /** The dropdown opened or closed. */
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpenState] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // Hold the scan popup while searching (#92, #127), and tell the POS to blur
  // the sale area under the dropdown.
  useDeskDialogOpen(open);
  function setOpen(next: boolean) {
    setOpenState(next);
    onOpenChange(next);
  }
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PosClimber[]>([]);
  // The query the current results are for, so "No climbers match" only shows
  // once the search for what was typed has answered.
  const [resultsFor, setResultsFor] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q === "") return;
    let current = true;
    const timer = setTimeout(async () => {
      try {
        const found = await findPosClimbers(q);
        if (current) {
          setResults(found);
          setResultsFor(q);
          setSearchError(null);
        }
      } catch {
        if (current) setSearchError("Couldn't search. Try again.");
      }
    }, SEARCH_DELAY_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query]);

  const searched = query.trim() !== "" && resultsFor === query.trim();

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setResultsFor("");
    setSearchError(null);
    input.current?.blur();
  }

  function pick(climber: PosClimber | { id: string; name: string }) {
    close();
    onSelect(climber);
  }

  return (
    <ClickAwayListener onClickAway={close}>
      <Box sx={{ position: "relative", width: { xs: "100%", sm: 480 } }}>
        <TextField
          fullWidth
          inputRef={input}
          type="search"
          label="Search climbers"
          placeholder="Name or phone. Typos are OK"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
        />
        {open ? (
          <Paper
            elevation={8}
            sx={{ position: "absolute", top: "100%", left: 0, right: 0, mt: 1, zIndex: "drawer", p: 3, maxHeight: 480, overflowY: "auto" }}
          >
            <div className="flex flex-col gap-2">
      {searchError ? <Alert severity="error">{searchError}</Alert> : null}
  
        {query.trim() !== "" ? (
          !searched ? (
            <Typography variant="secondary">Searching…</Typography>
          ) : results.length === 0 ? (
            <Typography variant="secondary">No climbers match.</Typography>
          ) : (
            <List dense disablePadding aria-label="Matching climbers">
              {results.map((c) => (
                <ListItem key={c.id} disablePadding>
                  <ListItemButton onClick={() => pick(c)}>
                    <ListItemText primary={c.name} secondary={c.phone} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )
        ) : (
          <>
            {renewalsDue.length ? (
              <>
                <Typography variant="secondary" component="h3" sx={{ mt: 1 }}>
                  Renewals due
                </Typography>
                <List dense disablePadding aria-label="Renewals due">
                  {renewalsDue.map((renewal) => (
                    <ListItem key={renewal.climberId} disablePadding>
                      <ListItemButton
                        onClick={() => {
                          close();
                          onRenew(renewal);
                        }}
                        sx={{ bgcolor: "warning.soft", "&:hover": { bgcolor: "warning.softHover" } }}
                      >
                        <ListItemText
                          primary={renewal.name}
                          secondary={`Monthly membership ${renewal.overdue ? "ended" : "ends"} ${formatDate(renewal.dueOn)}${renewal.hasBankAccount ? " · EFT on file" : ""}`}
                        />
                        <StatusPill status="warn" label={renewal.overdue ? "Overdue" : "Due"} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </>
            ) : null}
  
            <Typography variant="secondary" component="h3" sx={{ mt: 1 }}>
              Checked in today
            </Typography>
            {checkedInToday.length === 0 ? (
              <Typography variant="secondary">
                Nobody has checked in yet today. Search to find a climber.
              </Typography>
            ) : (
              <List dense disablePadding aria-label="Checked in today" className="max-h-96 overflow-y-auto">
                {checkedInToday.map((c) => (
                  <ListItem key={c.climberId} disablePadding>
                    <ListItemButton onClick={() => pick({ id: c.climberId, name: c.name })}>
                      <ListItemText primary={c.name} secondary={c.phone} />
                      <Typography variant="secondary" component="span">
                        {c.time}
                      </Typography>
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}
  
            </div>
          </Paper>
        ) : null}
      </Box>
    </ClickAwayListener>
  );
}
