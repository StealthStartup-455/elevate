import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ClimberCard from "@/components/climber/ClimberCard";
import { CheckIcon } from "@/components/climber/icons";
import { formatDate, membershipDateLine } from "@/features/climbers/format";
import type { Membership } from "@/features/climbers/queries";
import type { MembershipStatus } from "@/features/climbers/types";
import type { MyPass } from "../queries";

const STATUS: Record<MembershipStatus, string> = {
  active: "Active",
  paused: "Paused",
  expired: "Expired",
  none: "No membership",
};

type Props = {
  membership: Membership;
  /** From the Purchase data, when the gym sells in the app: the plan's name and dates. */
  current?: MyPass | null;
  upcoming?: MyPass | null;
  canPurchase: boolean;
};

// The membership's own line, from the shared membershipDateLine so it reads the same as the
// desk: "Renews" for a recurring plan, "Runs until" for a one-off one (#132), "Ended" once it
// has ended. Paused has no date while it's paused (#124), so the line just says so.
function dateLine({ membership, current }: Props): string {
  if (membership.status === "paused") return "Paused";
  const endsOn = membership.status === "expired" ? membership.renewsOn : (current?.endsOn ?? membership.renewsOn);
  return membershipDateLine(membership.status, endsOn, membership.recurring) ?? "";
}

// The Membership tab's teal card: the plan, whether it's active and until when, a plan bought
// early, and any day pass or punch card. Changes to a plan go through the front desk.
export default function PlanCard(props: Props) {
  const { membership, upcoming, canPurchase } = props;
  const none = membership.status === "none";
  const line = dateLine(props);
  const extras = [
    membership.hasDayPass ? "Day pass for today" : null,
    membership.punchesLeft > 0
      ? `Punch card · ${membership.punchesLeft} ${membership.punchesLeft === 1 ? "visit" : "visits"} left`
      : null,
  ].filter(Boolean);

  return (
    <ClimberCard tone="brand" label="Your plan" testId="plan-card">
      <div className="flex items-center justify-between gap-3">
        <Typography variant="secondary" component="span" sx={{ color: "inherit" }}>
          Your plan
        </Typography>
        <Box
          component="span"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1.5,
            bgcolor: "background.paper",
            color: membership.status === "active" ? "success.main" : membership.status === "none" ? "text.primary" : "error.main",
            typography: "label",
            px: 3,
            py: 1.5,
            borderRadius: 999,
          }}
        >
          {membership.status === "active" ? <CheckIcon size={14} /> : null}
          {STATUS[membership.status]}
        </Box>
      </div>
      <Typography variant="pageTitle" component="h2">
        {none ? "No membership yet" : (props.current?.name ?? membership.plan)}
      </Typography>
      {line ? (
        <Typography variant="body" sx={{ fontWeight: 700 }}>
          {line}
        </Typography>
      ) : null}
      {upcoming ? (
        <Typography variant="body">
          Next: {upcoming.name}, starts {formatDate(upcoming.startsOn, true)}
        </Typography>
      ) : null}
      {extras.length > 0 ? (
        <ul aria-label="Other passes" className="m-0 flex list-none flex-col gap-1 p-0">
          {extras.map((text) => (
            <li key={text}>
              <Typography variant="body">{text}</Typography>
            </li>
          ))}
        </ul>
      ) : null}
      <Typography variant="secondary" sx={{ color: "inherit" }}>
        {none
          ? canPurchase
            ? "Pick a membership or a day pass below."
            : "Ask at the front desk to buy one."
          : "Ask the front desk to change, pause or cancel your plan."}
      </Typography>
    </ClimberCard>
  );
}
