import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { formatDate } from "../format";
import { getMyMembership, type Membership } from "../queries";
import DemoQrCode from "./DemoQrCode";
import LinkButton from "./LinkButton";
import WaiverStep from "./WaiverStep";
import ScanButton from "@/features/check-ins/components/ScanButton";

const WAIVER_TEXT = {
  valid: { label: "✓ Waiver signed", color: "success.main" },
  expired: { label: "Waiver expired", color: "warning.main" },
  missing: { label: "No waiver on file", color: "error.main" },
} as const;

function renewalLine(membership: Membership): string {
  if (membership.hasDayPass && membership.status !== "active") return "Day pass for today";
  if (membership.punchesLeft > 0 && membership.status !== "active") {
    return `Punch card · ${membership.punchesLeft} ${membership.punchesLeft === 1 ? "visit" : "visits"} left`;
  }
  if (membership.status === "none" || !membership.renewsOn) {
    return "Buy a membership to start climbing";
  }
  const date = formatDate(membership.renewsOn);
  if (membership.status === "expired") return `Expired ${date}`;
  if (membership.status === "paused") return `Paused · renews ${date}`;
  return `Renews ${date}`;
}

function waiverExpiryLine(membership: Membership): string | null {
  if (!membership.waiverExpiresOn) return null;
  const date = formatDate(membership.waiverExpiresOn, true);
  return membership.waiverStatus === "valid" ? `Waiver expires ${date}` : `Expired ${date}`;
}

// Membership status and the code staff scan at check-in, plus what to do next:
// sign a missing or expired waiver, buy a first membership, or renew one that
// is paused or expired. A climber with no membership gets "Purchase Membership"
// under the QR code, which opens the Purchase tab.
// Layout follows the customer dashboard mock.
export default async function MembershipCard() {
  const membership = await getMyMembership();
  const waiver = WAIVER_TEXT[membership.waiverStatus];
  const title =
    membership.status === "none"
      ? "No membership"
      : `${membership.plan} · ${membership.status[0].toUpperCase()}${membership.status.slice(1)}`;
  const waiverExpiry = waiverExpiryLine(membership);
  const needsWaiver = membership.waiverStatus !== "valid";
  const needsPurchase = membership.status === "none";
  const needsRenewal = membership.status === "paused" || membership.status === "expired";

  return (
    <Card
      variant="outlined"
      sx={{ width: "100%", maxWidth: 560, borderRadius: 3, borderWidth: 2, borderColor: "text.primary" }}
    >
      <CardContent>
        <Box sx={{ display: "flex", gap: 4, justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Membership
            </Typography>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {renewalLine(membership)}
            </Typography>
            <Typography variant="body2" sx={{ mt: 2, fontWeight: 600, color: waiver.color }}>
              {waiver.label}
            </Typography>
            {waiverExpiry ? (
              <Typography variant="body2" color="text.secondary">
                {waiverExpiry}
              </Typography>
            ) : null}
          </Box>
          <Box sx={{ textAlign: "center", flexShrink: 0 }}>
            <DemoQrCode value={membership.memberCode} />
            <Typography variant="caption" component="p" color="text.secondary">
              Scan at desk
            </Typography>
            <Typography variant="caption" component="p" sx={{ fontFamily: "var(--font-geist-mono)" }}>
              {membership.memberCode}
            </Typography>
            <ScanButton
                waiverStatus={membership.waiverStatus}
                membershipStatus={membership.status}
                hasDayPass={membership.hasDayPass}
                punchesLeft={membership.punchesLeft}
            />
            {needsPurchase ? (
              <Box sx={{ mt: 2 }}>
                <LinkButton href="/me/purchase" variant="outlined">
                  Purchase Membership
                </LinkButton>
              </Box>
            ) : null}
          </Box>
        </Box>

        {needsWaiver || needsRenewal ? (
          <Box sx={{ mt: 5, display: "flex", flexDirection: "column", gap: 3 }}>
            {needsWaiver ? (
              <WaiverStep climberId={membership.climberId} />
            ) : null}
            {needsRenewal ? (
              <LinkButton href="/me/purchase" variant="outlined" size="large">
                Renew membership
              </LinkButton>
            ) : null}
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}
