"use client";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import DisabledReason from "@/components/ui/DisabledReason";
import LinkArrow from "@/components/ui/LinkArrow";
import StatusPill, { type Status } from "@/components/ui/StatusPill";
import { useBackdropClose } from "@/components/ui/useBackdropClose";
import { membershipDateLine, revokedLine } from "@/features/climbers/format";
import type { MembershipStatus, WaiverStatus } from "@/features/climbers/types";
import { revokeMembership } from "../actions";
import type { PosClimber } from "../types";
import { useDeskDialogOpen } from "@/features/check-ins/desk-dialogs";
import DeskBankAccount from "@/features/eft/components/DeskBankAccount";

const WAIVER: Record<WaiverStatus, { status: Status; label: string }> = {
  valid: { status: "ok", label: "Waiver valid" },
  expired: { status: "warn", label: "Waiver expired" },
  missing: { status: "bad", label: "No waiver" },
};

const MEMBERSHIP: Record<MembershipStatus, { status: Status; label: string }> = {
  active: { status: "ok", label: "Active membership" },
  paused: { status: "warn", label: "Membership paused" },
  expired: { status: "bad", label: "Membership expired" },
  none: { status: "neutral", label: "No membership" },
};

// The line under the pills: when the membership renews or ended, and any
// day pass or punch card.
function passDetail(c: PosClimber): string | null {
  const parts: string[] = [];
  // No date while paused (#124); "Runs until" for a one-off plan (#132).
  const line = membershipDateLine(c.membershipStatus, c.membershipRenewsOn, c.membershipRecurring);
  if (line) parts.push(line);
  if (c.hasDayPass) parts.push("Day pass for today");
  if (c.punchesLeft > 0) parts.push(`${c.punchesLeft} ${c.punchesLeft === 1 ? "punch" : "punches"} left`);
  return parts.length ? parts.join(" · ") : null;
}

// Left column of the POS: the picked climber, with a placeholder photo, their
// waiver and passes. The search that picks them is in the page header
// (`ClimberSearch`, #240).
export default function ClimberPanel({
  selected,
  loadingName,
  loadError,
  onUpdated,
}: {
  selected: PosClimber | null;
  /** A climber picked from a list, while their passes load. */
  loadingName: string | null;
  loadError: string | null;
  /** Their passes changed here (a revoke): load them again. */
  onUpdated: () => void;
}) {
  const waiver = selected ? WAIVER[selected.waiverStatus] : null;
  const membership = selected ? MEMBERSHIP[selected.membershipStatus] : null;
  const detail = selected ? passDetail(selected) : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <Typography variant="cardTitle">Climber</Typography>
        {loadError ? <Alert severity="warning">{loadError}</Alert> : null}
        {loadingName ? (
          <Typography variant="secondary">Loading {loadingName}…</Typography>
        ) : selected && waiver && membership ? (
          <div className="flex flex-col gap-2" role="group" aria-label="Selected climber">
            <div className="flex items-center gap-3">
              {/* A placeholder until climbers have photos. */}
              <Avatar aria-hidden sx={{ width: 56, height: 56, bgcolor: "action.selected", color: "text.secondary" }}>
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8z" />
                </svg>
              </Avatar>
              <div>
                <Typography variant="body" sx={{ fontWeight: 600 }}>
                  {selected.name}
                </Typography>
                {selected.phone ? <Typography variant="secondary">{selected.phone}</Typography> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill status={waiver.status} label={waiver.label} />
              <StatusPill status={membership.status} label={membership.label} />
            </div>
            {selected.revoked ? (
              // Revoked here or earlier: when and why, in place of "Ended" (#241).
              <Typography variant="secondary" color="error">
                {revokedLine(selected.revoked)}
              </Typography>
            ) : detail ? (
              <Typography variant="secondary" color={selected.membershipStatus === "expired" ? "error" : undefined}>
                {detail}
              </Typography>
            ) : null}
            {selected.bankAccount !== undefined ? (
              <DeskBankAccount
                // Its own key: a sibling sharing RevokeMembership's key renders twice.
                key={`bank-${selected.id}`}
                climberId={selected.id}
                climberName={selected.name}
                account={selected.bankAccount}
                onChanged={onUpdated}
              />
            ) : null}
            {selected.membershipStatus === "active" || selected.membershipStatus === "paused" ? (
              <RevokeMembership key={selected.id} climber={selected} onRevoked={onUpdated} />
            ) : null}
            <div className="flex justify-end">
              <LinkArrow href={`/desk/customers/${selected.id}`}>Open account</LinkArrow>
            </div>
          </div>
        ) : (
          <Typography variant="secondary">Nobody picked yet. Use Search climbers above.</Typography>
        )}
      </CardContent>
    </Card>
  );
}

// Ends the climber's membership now, after a confirm with a reason (#241),
// saved so there's a record if the member asks. No money moves: to refund,
// staff void the sale under Today's sales.
function RevokeMembership({ climber, onRevoked }: { climber: PosClimber; onRevoked: () => void }) {
  const [open, setOpen] = useState(false);
  // Hold the scan popup while revoking (#92, #127).
  useDeskDialogOpen(open);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    if (pending) return;
    setOpen(false);
    setReason("");
    setError(null);
  }

  // Outside clicks close it too, but not the second click of a double-click (#134, #218).
  const onClose = useBackdropClose(open, close);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await revokeMembership(climber.id, reason);
      if (result.ok) {
        setOpen(false);
        setReason("");
        onRevoked();
      } else setError(result.message ?? "Couldn't revoke the membership. Try again.");
    });
  }

  return (
    <>
      <div>
        <Button variant="outlined" color="error" size="small" onClick={() => setOpen(true)}>
          Revoke membership
        </Button>
      </div>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="revoke-title">
        <DialogTitle id="revoke-title">Revoke membership</DialogTitle>
        <DialogContent className="flex flex-col gap-3">
          <Typography variant="body">Revoke {climber.name}&apos;s membership?</Typography>
          <Typography variant="secondary">
            It stops working now, along with any renewal already bought, and won&apos;t come up for renewal. No money
            is given back: to refund, void the sale under Today&apos;s sales.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Reason"
            placeholder="Couldn't pay this month"
            helperText="Saved on their file, so there's a record if they ask."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
        </DialogContent>
        <DialogActions>
          <Button disabled={pending} onClick={close}>
            Keep membership
          </Button>
          {reason.trim() === "" ? (
            <DisabledReason reason="Give a reason first">
              <Button variant="contained" color="error" disabled>
                Revoke membership
              </Button>
            </DisabledReason>
          ) : (
            <Button variant="contained" color="error" disabled={pending} onClick={confirm}>
              {pending ? "Revoking…" : "Revoke membership"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
