import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { getMyMembership } from "../queries";
import DemoQrCode from "./DemoQrCode";

const WAIVER_TEXT = {
  valid: { label: "✓ Waiver signed", color: "success.main" },
  expired: { label: "Waiver expired: sign at the desk", color: "warning.main" },
  missing: { label: "No waiver on file: sign at the desk", color: "error.main" },
} as const;

function formatDate(isoDate: string): string {
  // Parsed as UTC and shown as UTC, so the date never shifts by a day.
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

// Membership status and the code staff scan at check-in. Layout follows the
// customer dashboard mock.
export default async function MembershipCard() {
  const membership = await getMyMembership();
  const waiver = WAIVER_TEXT[membership.waiverStatus];
  const status = membership.status[0].toUpperCase() + membership.status.slice(1);

  return (
    <Card
      variant="outlined"
      sx={{ width: "100%", maxWidth: 560, borderRadius: 3, borderWidth: 2, borderColor: "text.primary" }}
    >
      <CardContent
        sx={{ p: { xs: 2, sm: 3 }, display: "flex", gap: 2, justifyContent: "space-between", alignItems: "center" }}
      >
        <Box>
          <Typography variant="body2" color="text.secondary">
            Membership
          </Typography>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            {membership.plan} · {status}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Renews {formatDate(membership.renewsOn)}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, fontWeight: 600, color: waiver.color }}>
            {waiver.label}
          </Typography>
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
      </CardContent>
    </Card>
  );
}
