import Typography from "@mui/material/Typography";
import ClimberCard from "@/components/climber/ClimberCard";
import IconTile from "@/components/climber/IconTile";
import { CardIcon, WaiverIcon } from "@/components/climber/icons";
import { isOnlinePurchaseEnabled } from "@/features/purchase/queries";
import { getMyMembership } from "../queries";
import LinkButton from "./LinkButton";

// "Before you climb", on Home, only when something stops the climber getting in: no valid
// waiver, or nothing that covers today (membership, day pass or punch card). Each line says
// what's wrong and the one thing to do about it.
export default async function ReadyToClimb() {
  const [membership, canPurchase] = await Promise.all([getMyMembership(), isOnlinePurchaseEnabled()]);
  const needsWaiver = membership.waiverStatus !== "valid";
  const covered = membership.status === "active" || membership.hasDayPass || membership.punchesLeft > 0;
  if (!needsWaiver && covered) return null;

  const pass = {
    none: { title: "No membership", detail: "Buy a membership or a day pass to start climbing.", action: "Buy a membership" },
    expired: { title: "Membership expired", detail: "Renew it to keep climbing.", action: "Renew membership" },
    paused: { title: "Membership paused", detail: "Renew it, or ask the desk to restart it.", action: "Renew membership" },
    active: null,
  }[membership.status];

  return (
    <ClimberCard title="Before you climb" testId="ready-to-climb">
      {needsWaiver ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <IconTile tone="bad">
              <WaiverIcon />
            </IconTile>
            <div>
              <Typography variant="body" sx={{ fontWeight: 700 }}>
                {membership.waiverStatus === "expired" ? "Waiver expired" : "No waiver on file"}
              </Typography>
              <Typography variant="secondary">It takes about two minutes. Sign it before your visit.</Typography>
            </div>
          </div>
          <LinkButton href="/me/waiver?next=/me" variant="contained" fullWidth>
            {membership.waiverStatus === "expired" ? "Sign the waiver again" : "Sign the waiver"}
          </LinkButton>
        </div>
      ) : null}
      {!covered && pass ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <IconTile tone={membership.status === "none" ? "neutral" : "warn"}>
              <CardIcon />
            </IconTile>
            <div>
              <Typography variant="body" sx={{ fontWeight: 700 }}>
                {pass.title}
              </Typography>
              <Typography variant="secondary">
                {canPurchase ? pass.detail : "Ask at the front desk."}
              </Typography>
            </div>
          </div>
          {canPurchase ? (
            // One teal button per card: the waiver comes first when both are missing.
            <LinkButton href="/me/membership" variant={needsWaiver ? "outlined" : "contained"} fullWidth>
              {pass.action}
            </LinkButton>
          ) : null}
        </div>
      ) : null}
    </ClimberCard>
  );
}
