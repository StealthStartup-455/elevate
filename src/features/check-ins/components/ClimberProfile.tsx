"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import DisabledReason from "@/components/ui/DisabledReason";
import { checkInClimber, signWaiver } from "@/features/climbers/actions";
import ClimberDetails from "@/features/climbers/components/ClimberDetails";
import LinkButton from "@/features/climbers/components/LinkButton";
import { formatDate, memberCode, membershipDateLine, membershipPlanName } from "@/features/climbers/format";
import type { Climber } from "@/features/climbers/types";
import type { DeskClimberPanel } from "../actions";
import { badgeFor } from "../day";
import { deskNextStep } from "../scan-messages";
import BadgePill from "./BadgePill";

// What's inside the climber panel (#169), top to bottom: name, photo, who
// they are, whether they can check in (and the fix if not), membership,
// passes and details (edited right here, so staff never leave Check-in),
// attributes, and Sell pass.

export type ProfileState =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "missing" }
  | { kind: "ready"; panel: DeskClimberPanel };

const OFFLINE = "Couldn't reach the server. Check the connection and try again.";

const TITLE_ID = "climber-panel-title";

const posHref = (id: string) => `/desk/pos?climber=${id}`;

export default function ClimberProfile({
  climberId,
  state,
  onClose,
  onChanged,
}: {
  climberId: string;
  state: ProfileState;
  onClose: () => void;
  /** Reads the climber again after a change; resolves once the panel shows it. */
  onChanged: () => Promise<void>;
}) {
  if (state.kind !== "ready") {
    const title = state.kind === "missing" ? "Climber not found" : "Climber";
    return (
      <div className="flex flex-col gap-3 p-4">
        <Header title={title} onClose={onClose} />
        {state.kind === "loading" ? (
          <Typography variant="secondary" role="status">
            Loading...
          </Typography>
        ) : state.kind === "missing" ? (
          <Typography variant="body">There&apos;s no climber with this link at your gym.</Typography>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <Alert severity="error">{OFFLINE}</Alert>
            <Button variant="outlined" onClick={() => void onChanged()}>
              Try again
            </Button>
          </div>
        )}
      </div>
    );
  }

  const { panel } = state;
  const c = panel.climber;
  return (
    <>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        <Header title={`${c.lastName}, ${c.firstName}`} onClose={onClose} />
        <Photo />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <BadgePill badge={panel.employee ? "EMPLOYEE" : badgeFor(c)} />
            <Typography variant="secondary" component="span">
              {panel.gymName}
            </Typography>
          </div>
          <Typography variant="body" component="p">
            <Box component="span" sx={{ fontWeight: 600 }}>
              {formatDate(c.dateOfBirth, true)}
            </Box>{" "}
            <Typography variant="secondary" component="span">
              ({panel.age})
            </Typography>
          </Typography>
        </div>
        <div>
          <Typography
            variant="body"
            component="span"
            className="inline-flex rounded-md border px-2"
            sx={{ fontFamily: "var(--font-mono)" }}
          >
            <span className="sr-only">Member code </span>
            {memberCode(c.id)}
          </Typography>
        </div>
        <StatusBox panel={panel} onChanged={onChanged} />
        <Membership climber={c} />
        <PassesAndDetails climber={c} onChanged={onChanged} />
        <Attributes panel={panel} />
      </div>
      {/* Staff on an employee pass don't buy passes. */}
      {panel.employee ? null : (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3">
          <SellPass climberId={climberId} posEnabled={panel.posEnabled} variant="outlined" />
        </div>
      )}
    </>
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <Typography variant="cardTitle" component="h2" id={TITLE_ID}>
        {title}
      </Typography>
      {/* A text glyph, like the table's ···: keeps the header as short as the text. */}
      <IconButton aria-label="Close" onClick={onClose} sx={{ lineHeight: 1 }}>
        ✕
      </IconButton>
    </div>
  );
}

// No photos are stored yet: a placeholder the size the photo will be.
function Photo() {
  return (
    <Box
      role="img"
      aria-label="No photo yet"
      className="flex h-50 items-end justify-center overflow-hidden rounded-lg"
      sx={{ bgcolor: "divider", color: "text.secondary" }}
    >
      <svg viewBox="0 0 120 100" className="h-40" fill="currentColor" aria-hidden="true">
        <circle cx="60" cy="34" r="22" />
        <path d="M18 100c0-26 18.8-42 42-42s42 16 42 42z" />
      </svg>
    </Box>
  );
}

// Why they can't check in, one line each. The waiver comes first, like the
// desk's next step (deskNextStep).
function reasons(c: Climber, needsWaiver: boolean, needsPass: boolean): string[] {
  const list: string[] = [];
  if (needsWaiver) list.push(c.waiverStatus === "missing" ? "No waiver signed." : "Waiver expired.");
  if (needsPass) {
    const lead =
      c.membershipStatus === "expired"
        ? `Membership ended${c.membershipRenewsOn ? ` ${formatDate(c.membershipRenewsOn, true)}` : ""}`
        : c.membershipStatus === "paused"
          ? "Membership paused"
          : "No membership";
    list.push(`${lead}, and no day pass or punch card.`);
  }
  return list;
}

function StatusBox({ panel, onChanged }: { panel: DeskClimberPanel; onChanged: () => Promise<void> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const c = panel.climber;

  // The same rules as checkInClimber: deskNextStep is null when they can check
  // in. Otherwise the waiver, a pass (badgeFor says NO_PASS), or both.
  const blocked = deskNextStep(c) !== null;
  const needsWaiver = c.waiverStatus !== "valid";
  const needsPass = badgeFor(c) === "NO_PASS";

  function run(action: () => Promise<{ ok: boolean; message?: string }>, failed: string) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          setError(result.message ?? failed);
          return;
        }
        router.refresh(); // the table and the counts
        await onChanged(); // this panel
      } catch {
        setError(OFFLINE);
      }
    });
  }

  const checkIn = () => run(() => checkInClimber(c.id), "Couldn't check in. Try again.");
  // The desk's waiver step, the same as the scan popup and the climber page.
  const startWaiver = () => run(() => signWaiver(c.id), "Couldn't sign the waiver. Try again.");

  const errorAlert = error ? <Alert severity="error">{error}</Alert> : null;

  if (panel.checkedInAt) {
    return <Alert severity="success">Checked in at {panel.checkedInAt}</Alert>;
  }

  if (!blocked) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
          <Typography variant="body" sx={{ fontWeight: 600 }}>
            Ready to check in
          </Typography>
          <Button variant="contained" onClick={checkIn} disabled={pending}>
            Check in
          </Button>
        </div>
        {errorAlert}
      </div>
    );
  }

  const fixes: { key: string; button: (contained: boolean) => ReactNode }[] = [];
  if (needsWaiver) {
    fixes.push({
      key: "waiver",
      button: (contained) => (
        <Button variant={contained ? "contained" : "outlined"} onClick={startWaiver} disabled={pending}>
          Start waiver
        </Button>
      ),
    });
  }
  if (needsPass) {
    fixes.push({
      key: "pass",
      button: (contained) => (
        <SellPass
          climberId={c.id}
          posEnabled={panel.posEnabled}
          variant={contained ? "contained" : "outlined"}
        />
      ),
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Alert severity="warning">
        <Typography variant="body" sx={{ fontWeight: 600 }}>
          Can&apos;t check in yet
        </Typography>
        {reasons(c, needsWaiver, needsPass).map((line) => (
          <Typography key={line} variant="body">
            {line}
          </Typography>
        ))}
      </Alert>
      {fixes.length === 1 ? (
        <div>{fixes[0].button(true)}</div>
      ) : (
        // Two problems: in order, and only the first is the filled button.
        <ol className="flex flex-col gap-2">
          {fixes.map((fix, i) => (
            <li key={fix.key} className="flex items-center gap-2">
              <Typography variant="secondary" component="span" sx={{ fontWeight: 600 }}>
                {i + 1}
              </Typography>
              {fix.button(i === 0)}
            </li>
          ))}
        </ol>
      )}
      <div>
        <DisabledReason
          reason={
            needsWaiver && needsPass
              ? "They need a valid waiver and a pass first."
              : needsWaiver
                ? "They need a valid waiver first."
                : "They need a membership, day pass or punch card first."
          }
        >
          <Button variant="outlined" disabled>
            Check in
          </Button>
        </DisabledReason>
      </div>
      {errorAlert}
    </div>
  );
}

function SellPass({
  climberId,
  posEnabled,
  variant,
}: {
  climberId: string;
  posEnabled: boolean;
  variant: "contained" | "outlined";
}) {
  if (!posEnabled) {
    return (
      <DisabledReason reason="This gym doesn't sell passes in Elevate.">
        <Button variant={variant} disabled>
          Sell pass
        </Button>
      </DisabledReason>
    );
  }
  return (
    <LinkButton href={posHref(climberId)} variant={variant}>
      Sell pass
    </LinkButton>
  );
}

function Membership({ climber: c }: { climber: Climber }) {
  const plan = c.membershipStatus === "none" ? "None" : membershipPlanName(c.membershipPlan, c.membershipRecurring);
  const line =
    c.membershipStatus === "paused"
      ? "Paused"
      : membershipDateLine(c.membershipStatus, c.membershipRenewsOn, c.membershipRecurring);
  return (
    <div className="flex flex-col">
      <Typography variant="secondary">Membership</Typography>
      <Typography variant="body">
        {plan}
        {line ? (
          <Typography
            variant="body"
            component="span"
            // An expired membership is red wherever it shows (STYLE_GUIDE.md, Status).
            color={c.membershipStatus === "expired" ? "error" : undefined}
          >
            {" · "}
            {line}
          </Typography>
        ) : null}
      </Typography>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "error" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-2">
      <Typography variant="body" component="dt">
        {label}
      </Typography>
      <Typography variant="body" component="dd" color={tone} sx={{ textAlign: "right" }}>
        {value}
      </Typography>
    </div>
  );
}

function gymAccess(c: Climber): { value: string; tone?: "error" } {
  switch (c.membershipStatus) {
    case "active":
      // A plan that renews (or has no end) is unlimited; a one-off one ends.
      return {
        value: c.membershipRecurring || !c.membershipRenewsOn ? "Unlimited" : `Until ${formatDate(c.membershipRenewsOn)}`,
      };
    case "paused":
      return { value: "Paused" };
    case "expired":
      return { value: c.membershipRenewsOn ? `Ended ${formatDate(c.membershipRenewsOn)}` : "Ended", tone: "error" };
    case "none":
      return { value: "None" };
  }
}

function PassesAndDetails({ climber: c, onChanged }: { climber: Climber; onChanged: () => Promise<void> }) {
  const router = useRouter();
  const [tab, setTab] = useState<"passes" | "details">("passes");
  const access = gymAccess(c);
  const punches = c.punchesLeft > 0 ? `${c.punchesLeft} visit${c.punchesLeft === 1 ? "" : "s"} left` : "None";
  return (
    <div className="flex flex-col">
      <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="Climber information">
        <Tab value="passes" label="Passes" id="climber-tab-passes" aria-controls="climber-tabpanel-passes" />
        <Tab value="details" label="Details" id="climber-tab-details" aria-controls="climber-tabpanel-details" />
      </Tabs>
      <div
        role="tabpanel"
        id={`climber-tabpanel-${tab}`}
        aria-labelledby={`climber-tab-${tab}`}
      >
        {tab === "passes" ? (
          <dl>
            <Row label="Gym access" value={access.value} tone={access.tone} />
            <Row label="Punch card" value={punches} />
            <Row label="Day pass today" value={c.hasDayPass ? "Yes" : "No"} />
          </dl>
        ) : (
          // The same details and edit form as their page on Customers.
          <div className="pt-3">
            <ClimberDetails
              climberId={c.id}
              details={{
                firstName: c.firstName,
                lastName: c.lastName,
                phone: c.phone,
                email: c.email,
                dateOfBirth: c.dateOfBirth,
              }}
              onSaved={() => {
                router.refresh(); // a new name shows in the table too
                void onChanged(); // and in this panel
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Attribute({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <Typography variant="secondary" component="dt">
        {label}
      </Typography>
      <Typography variant="body" component="dd">
        {children}
      </Typography>
    </div>
  );
}

function Attributes({ panel }: { panel: DeskClimberPanel }) {
  const { waiver, climber: c } = panel;
  const waiverText =
    waiver.status === "missing"
      ? "Not signed"
      : waiver.status === "expired"
        ? `Expired${waiver.signedOn ? ` · signed ${waiver.signedOn}` : ""}`
        : `Valid${waiver.expiresOn ? ` · expires ${formatDate(waiver.expiresOn, true)}` : ""}`;
  return (
    <div className="flex flex-col gap-2">
      <Typography variant="cardTitle">Attributes</Typography>
      <dl className="grid grid-cols-2 gap-3">
        <Attribute label="Waiver">
          {/* Expired or missing is amber here; the words say it too. */}
          <Box
            component="span"
            sx={waiver.status === "valid" ? undefined : { color: "warning.main", fontWeight: 600 }}
          >
            {waiverText}
          </Box>
        </Attribute>
        <Attribute label="Belay status">Not recorded</Attribute>
        <Attribute label="Phone">{c.phone || "Not given"}</Attribute>
      </dl>
    </div>
  );
}
