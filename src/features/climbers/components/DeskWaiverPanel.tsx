import Typography from "@mui/material/Typography";
import StatusPill, { type Status } from "@/components/ui/StatusPill";
import type { StaffWaiverPanel } from "@/features/waivers/queries";
import { formatDate } from "../format";
import type { WaiverStatus } from "../types";
import LinkButton from "./LinkButton";

const PILL: Record<WaiverStatus, { status: Status; label: string }> = {
  valid: { status: "ok", label: "Valid" },
  expired: { status: "warn", label: "Expired" },
  missing: { status: "bad", label: "No waiver" },
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3">
      <Typography variant="secondary" component="dt">
        {label}
      </Typography>
      <Typography variant="body" component="dd">
        {value}
      </Typography>
    </div>
  );
}

// The waiver on a climber's page at the desk (#147): its status first, then
// when it was signed, when it runs out and which wording, and a way to read
// it. Expired and missing get the same panel with their own status.
export default function DeskWaiverPanel({ waiver }: { waiver: StaffWaiverPanel }) {
  const pill = PILL[waiver.status];
  return (
    <div className="flex flex-col gap-2 rounded-md border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Typography variant="label">Waiver</Typography>
        <StatusPill status={pill.status} label={pill.label} />
      </div>
      {waiver.signedOn ? (
        <dl className="flex flex-col gap-1">
          <Fact label="Signed" value={waiver.signedOn} />
          {waiver.expiresOn ? (
            <Fact
              label={waiver.status === "valid" ? "Expires" : "Expired"}
              value={formatDate(waiver.expiresOn, true)}
            />
          ) : null}
          <Fact label="Version" value={waiver.version ?? ""} />
        </dl>
      ) : (
        <Typography variant="secondary">They haven&apos;t signed a waiver yet.</Typography>
      )}
      {waiver.waiverId ? (
        <div>
          <LinkButton href={`/desk/waivers/${waiver.waiverId}`} variant="outlined" size="small">
            Look at waiver
          </LinkButton>
        </div>
      ) : null}
    </div>
  );
}
