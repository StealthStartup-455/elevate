import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import StatusPill, { type Status } from "@/components/ui/StatusPill";
import { formatDate } from "@/features/climbers/format";
import LinkButton from "@/features/climbers/components/LinkButton";
import type { MembershipStatus } from "@/features/climbers/types";
import type { PurchasePageData } from "../queries";

const STATUS: Record<MembershipStatus, { status: Status; label: string }> = {
  active: { status: "ok", label: "Active" },
  paused: { status: "warn", label: "Paused" },
  expired: { status: "bad", label: "Expired" },
  none: { status: "neutral", label: "No membership" },
};

// Passes that aren't a membership but still get someone in.
function otherPasses({ hasDayPass, punchesLeft }: PurchasePageData["membership"]): string[] {
  const lines: string[] = [];
  if (hasDayPass) lines.push("Day pass for today");
  if (punchesLeft > 0) lines.push(`Punch card · ${punchesLeft} ${punchesLeft === 1 ? "visit" : "visits"} left`);
  return lines;
}

// "Your plan": the membership in effect, one bought early, any day pass or
// punch card, and the waiver. A missing waiver never blocks a purchase, but
// it is the next thing to do before climbing, so it sits here with the way to
// sign it.
export default function MyPlan({ data }: { data: PurchasePageData }) {
  const { membership, current, upcoming } = data;
  const state = STATUS[membership.status];
  const extras = otherPasses(membership);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Typography variant="cardTitle">Your plan</Typography>
          <StatusPill status={state.status} label={state.label} />
        </div>

        {current ? (
          <div>
            <Typography variant="body" sx={{ fontWeight: 600 }}>
              {current.name}
            </Typography>
            {current.endsOn ? (
              <Typography variant="secondary" color={membership.status === "expired" ? "error" : undefined}>
                {membership.status === "expired" ? "Ended" : "Runs until"} {formatDate(current.endsOn, true)}
              </Typography>
            ) : null}
          </div>
        ) : membership.status === "expired" && membership.renewsOn ? (
          <Typography variant="secondary" color="error">
            Ended {formatDate(membership.renewsOn, true)}
          </Typography>
        ) : (
          <Typography variant="secondary">You don&apos;t have a membership yet. Open Membership below to pick one.</Typography>
        )}

        {upcoming ? (
          <Typography variant="secondary">
            Next: {upcoming.name}, starts {formatDate(upcoming.startsOn, true)}
          </Typography>
        ) : null}

        {extras.length > 0 ? (
          <ul className="flex flex-col gap-1" aria-label="Other passes">
            {extras.map((line) => (
              <li key={line}>
                <Typography variant="body">{line}</Typography>
              </li>
            ))}
          </ul>
        ) : null}

        {membership.waiverStatus !== "valid" ? (
          <div className="flex flex-col gap-2">
            <Typography variant="body">
              {membership.waiverStatus === "expired"
                ? "Your waiver has expired. Sign a new one before you climb."
                : "You haven't signed the waiver yet. You can buy now, but sign it before you climb."}
            </Typography>
            <div>
              <LinkButton href="/me/waiver?next=/me/purchase" variant="outlined">
                {membership.waiverStatus === "expired" ? "Sign the waiver again" : "Sign the waiver"}
              </LinkButton>
            </div>
          </div>
        ) : (
          <StatusPill status="ok" label="Waiver signed" />
        )}
      </CardContent>
    </Card>
  );
}
