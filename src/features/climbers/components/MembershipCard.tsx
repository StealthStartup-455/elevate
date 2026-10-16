import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { formatDate } from "../format";
import { getMyMembership, type Membership } from "../queries";
import DemoQrCode from "./DemoQrCode";
import WaiverStep from "./WaiverStep";

const WAIVER_TEXT = {
  valid: { label: "✓ Waiver signed", color: "success.main" },
  expired: { label: "Waiver expired", color: "warning.main" },
  missing: { label: "No waiver on file", color: "error.main" },
} as const;

function renewalLine(membership: Membership): string {
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
// is paused or expired.
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
          </Box>
        </Box>

        {needsWaiver || needsRenewal || needsPurchase ? (
          <Box sx={{ mt: 5, display: "flex", flexDirection: "column", gap: 3 }}>
            {needsWaiver ? (
              <WaiverStep climberId={membership.climberId} />
            ) : null}
            {needsPurchase ? (
              // Placeholder until memberships and payments exist.
              <Button variant="contained" size="large" disabled title="Coming soon">
                Buy membership
              </Button>
            ) : null}
            {needsRenewal ? (
              // Placeholder until memberships and payments exist.
              <Button variant="outlined" size="large" disabled title="Coming soon">
                Renew membership
              </Button>
            ) : null}
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}
