"use client";

import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import LinkArrow from "@/components/ui/LinkArrow";
import StatusPill, { type Status } from "@/components/ui/StatusPill";
import { formatDate } from "@/features/climbers/format";
import { bestMatches } from "@/features/climbers/search";
import type { MembershipStatus, WaiverStatus } from "@/features/climbers/types";
import type { PosClimber, RecentCheckIn, RenewalDue } from "../types";

const MAX_RESULTS = 8;

const WAIVER: Record<WaiverStatus, { status: Status; label: string }> = {
  valid: { status: "ok", label: "Waiver valid" },
  expired: { status: "warn", label: "Waiver expired" },
  missing: { status: "bad", label: "No waiver" },
};

const MEMBERSHIP: Record<MembershipStatus, { status: Status; label: string }> = {
  active: { status: "ok", label: "Active membership" },
  paused: { status: "warn", label: "Membership paused" },
  expired: { status: "warn", label: "Membership expired" },
  none: { status: "neutral", label: "No membership" },
};

// The line under the pills: when the membership renews or ended, and any
// day pass or punch card.
function passDetail(c: PosClimber): string | null {
  const parts: string[] = [];
  if (c.membershipRenewsOn && c.membershipStatus !== "none") {
    const date = formatDate(c.membershipRenewsOn, true);
    parts.push(c.membershipStatus === "expired" ? `Ended ${date}` : `Renews ${date}`);
  }
  if (c.hasDayPass) parts.push("Day pass for today");
  if (c.punchesLeft > 0) parts.push(`${c.punchesLeft} ${c.punchesLeft === 1 ? "punch" : "punches"} left`);
  return parts.length ? parts.join(" · ") : null;
}

// Left column of the POS: find the climber the sale is for. Shows today's
// check-ins and renewals due until staff search; once picked, a summary
// with their waiver and passes.
export default function ClimberPanel({
  climbers,
  checkedInToday,
  renewalsDue,
  selected,
  onSelect,
  onRenew,
  onChange,
}: {
  climbers: PosClimber[];
  checkedInToday: RecentCheckIn[];
  renewalsDue: RenewalDue[];
  selected: PosClimber | null;
  onSelect: (id: string) => void;
  onRenew: (renewal: RenewalDue) => void;
  onChange: () => void;
}) {
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(climbers.map((c) => [c.id, c])), [climbers]);

  const results = useMemo(() => bestMatches(climbers, query, MAX_RESULTS), [climbers, query]);

  function pick(id: string) {
    setQuery("");
    onSelect(id);
  }

  if (selected) {
    const waiver = WAIVER[selected.waiverStatus];
    const membership = MEMBERSHIP[selected.membershipStatus];
    const detail = passDetail(selected);
    return (
      <Card>
        <CardContent className="flex flex-col gap-2">
          <Typography variant="cardTitle">Climber</Typography>
          <div>
            <Typography variant="body" sx={{ fontWeight: 600 }}>
              {selected.name}
            </Typography>
            {selected.phone ? <Typography variant="secondary">{selected.phone}</Typography> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill status={waiver.status} label={waiver.label} />
            <StatusPill status={membership.status} label={membership.label} />
          </div>
          {detail ? <Typography variant="secondary">{detail}</Typography> : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outlined" size="small" onClick={onChange}>
              Change climber
            </Button>
            <LinkArrow href={`/desk/climbers/${selected.id}`}>Open account</LinkArrow>
          </div>
        </CardContent>
      </Card>
    );
  }

  const recent = checkedInToday.flatMap((c) => {
    const climber = byId.get(c.climberId);
    return climber ? [{ climber, time: c.time }] : [];
  });
  const renewals = renewalsDue.flatMap((r) => {
    const climber = byId.get(r.climberId);
    return climber ? [{ climber, renewal: r }] : [];
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <Typography variant="cardTitle">Climber</Typography>
        <TextField
          fullWidth
          size="small"
          type="search"
          label="Search name or phone"
          placeholder="Typos are OK"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {query.trim() !== "" ? (
          results.length === 0 ? (
            <Typography variant="secondary">No climbers match.</Typography>
          ) : (
            <List dense disablePadding aria-label="Matching climbers">
              {results.map((c) => (
                <ListItem key={c.id} disablePadding>
                  <ListItemButton onClick={() => pick(c.id)}>
                    <ListItemText primary={c.name} secondary={c.phone} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )
        ) : (
          <>
            {renewals.length ? (
              <>
                <Typography variant="secondary" component="h3" sx={{ mt: 1 }}>
                  Renewals due
                </Typography>
                <List dense disablePadding aria-label="Renewals due">
                  {renewals.map(({ climber, renewal }) => (
                    <ListItem key={climber.id} disablePadding>
                      <ListItemButton onClick={() => onRenew(renewal)}>
                        <ListItemText
                          primary={climber.name}
                          secondary={`Monthly membership ${renewal.overdue ? "ended" : "ends"} ${formatDate(renewal.dueOn)}`}
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
            {recent.length === 0 ? (
              <Typography variant="secondary">
                Nobody has checked in yet today. Search to find a climber.
              </Typography>
            ) : (
              <List dense disablePadding aria-label="Checked in today" className="max-h-96 overflow-y-auto">
                {recent.map(({ climber, time }) => (
                  <ListItem key={climber.id} disablePadding>
                    <ListItemButton onClick={() => pick(climber.id)}>
                      <ListItemText primary={climber.name} secondary={climber.phone} />
                      <Typography variant="secondary" component="span">
                        {time}
                      </Typography>
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
