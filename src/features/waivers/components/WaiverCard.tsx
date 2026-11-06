import Typography from "@mui/material/Typography";
import ClimberCard from "@/components/climber/ClimberCard";
import ClimberLink from "@/components/climber/ClimberLink";
import IconTile from "@/components/climber/IconTile";
import { WaiverIcon } from "@/components/climber/icons";
import { getSessionClimberId } from "@/features/auth/queries";
import { formatDate } from "@/features/climbers/format";
import LinkButton from "@/features/climbers/components/LinkButton";
import { getWaiverStatus } from "../queries";

// The waiver on the Membership tab: signed and until when, with a link to read it, or the way
// to sign one. Signing comes back here (`next`).
export default async function WaiverCard() {
  const climberId = await getSessionClimberId();
  const waiver: Awaited<ReturnType<typeof getWaiverStatus>> = climberId
    ? await getWaiverStatus(climberId)
    : { status: "missing" };
  const valid = waiver.status === "valid";

  return (
    <ClimberCard label="Waiver" testId="waiver-card">
      <div className="flex items-center gap-3">
        <IconTile tone={valid ? "ok" : "bad"}>
          <WaiverIcon />
        </IconTile>
        <div className="flex min-w-0 flex-1 flex-col">
          <Typography variant="body" sx={{ fontWeight: 700 }}>
            {valid ? "Waiver signed" : waiver.status === "expired" ? "Waiver expired" : "No waiver on file"}
          </Typography>
          <Typography variant="secondary">
            {valid && waiver.expiresOn
              ? `Good until ${formatDate(waiver.expiresOn, true)}`
              : "Sign it before you climb."}
          </Typography>
        </div>
        {valid && waiver.waiverId ? <ClimberLink href={`/me/waiver/${waiver.waiverId}`}>View</ClimberLink> : null}
      </div>
      {valid ? null : (
        <LinkButton href="/me/waiver?next=/me/membership" fullWidth>
          {waiver.status === "expired" ? "Sign the waiver again" : "Sign the waiver"}
        </LinkButton>
      )}
    </ClimberCard>
  );
}
