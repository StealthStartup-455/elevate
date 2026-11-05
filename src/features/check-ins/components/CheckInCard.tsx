import Typography from "@mui/material/Typography";
import ClimberCard from "@/components/climber/ClimberCard";
import ClimberLink from "@/components/climber/ClimberLink";
import { SunIcon } from "@/components/climber/icons";
import StatusPill from "@/components/ui/StatusPill";
import DemoQrCode from "@/features/climbers/components/DemoQrCode";
import { getMyMembership, type Membership } from "@/features/climbers/queries";
import ScanButton from "./ScanButton";

// What gets them in today, as the desk sees it: a membership, else a day pass, else a punch card.
function passPill(m: Membership): { status: "ok" | "warn" | "bad"; label: string } {
  if (m.status === "active") return { status: "ok", label: "Membership active" };
  if (m.hasDayPass) return { status: "ok", label: "Day pass today" };
  if (m.punchesLeft > 0) return { status: "ok", label: `Punch card · ${m.punchesLeft} left` };
  if (m.status === "paused") return { status: "warn", label: "Membership paused" };
  if (m.status === "expired") return { status: "bad", label: "Membership expired" };
  return { status: "bad", label: "No membership" };
}

const WAIVER_PILL = {
  valid: { status: "ok", label: "Waiver signed" },
  expired: { status: "bad", label: "Waiver expired" },
  missing: { status: "bad", label: "No waiver" },
} as const;

// The Check in tab: the code the desk scans, big, with who it belongs to and whether they're
// set to climb. The desk sorts out anything missing when they scan, so nothing here blocks it.
export default async function CheckInCard() {
  const membership = await getMyMembership();
  const pass = passPill(membership);

  return (
    <>
      <ClimberCard label="Your check-in code">
        <div className="flex flex-col items-center gap-4 text-center">
          <DemoQrCode value={membership.memberCode} size={240} />
          <div className="flex flex-col gap-1">
            <Typography variant="cardTitle" component="p" sx={{ fontSize: "1.375rem" }}>
              {membership.firstName} {membership.lastName}
            </Typography>
            <Typography variant="body" sx={{ fontFamily: "var(--font-plex-mono)", letterSpacing: "0.06em", color: "text.secondary" }}>
              {membership.memberCode}
            </Typography>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <StatusPill status={pass.status} label={pass.label} />
            <StatusPill {...WAIVER_PILL[membership.waiverStatus]} />
          </div>
          {membership.waiverStatus !== "valid" ? (
            <ClimberLink href="/me/waiver?next=/me/check-in">Sign the waiver</ClimberLink>
          ) : null}
        </div>
      </ClimberCard>

      <div className="flex items-center gap-3 px-1">
        <Typography component="span" sx={{ color: "text.secondary", display: "flex" }}>
          <SunIcon />
        </Typography>
        <Typography variant="secondary">Turn your screen brightness up if the scanner has trouble reading it.</Typography>
      </div>

      <ScanButton
        waiverStatus={membership.waiverStatus}
        membershipStatus={membership.status}
        hasDayPass={membership.hasDayPass}
        punchesLeft={membership.punchesLeft}
      />
    </>
  );
}
