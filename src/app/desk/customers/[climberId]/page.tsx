import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import StatusPill, { type Status } from "@/components/ui/StatusPill";
import { requireStaff } from "@/features/auth/staff";
import ClimberDetails from "@/features/climbers/components/ClimberDetails";
import DeskWaiverPanel from "@/features/climbers/components/DeskWaiverPanel";
import LinkButton from "@/features/climbers/components/LinkButton";
import WaiverStep from "@/features/climbers/components/WaiverStep";
import { membershipDateLine } from "@/features/climbers/format";
import { getClimber } from "@/features/climbers/queries";
import type { MembershipStatus } from "@/features/climbers/types";
import { getStaffWaiverPanel } from "@/features/waivers/queries";

const MEMBERSHIP: Record<MembershipStatus, { status: Status; label: string }> = {
  active: { status: "ok", label: "Active" },
  paused: { status: "warn", label: "Paused" },
  expired: { status: "bad", label: "Expired" },
  none: { status: "neutral", label: "No membership" },
};

export default function ClimberPage({
  params,
  searchParams,
}: PageProps<"/desk/customers/[climberId]">) {
  return (
    <div className="mx-auto flex w-full max-w-narrow flex-col gap-4 sm:gap-6">
      <div className="flex flex-col items-start">
        <LinkButton href="/desk/customers" variant="text">
          ← Customers
        </LinkButton>
      </div>
      <Suspense fallback={<p>Loading...</p>}>
        <ClimberCard params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ClimberCard({
  params,
  searchParams,
}: Pick<PageProps<"/desk/customers/[climberId]">, "params" | "searchParams">) {
  const { climberId } = await params;
  // ?added=1: staff just created this climber at the desk (#88).
  const query = await searchParams;
  const justAdded = query.added === "1";
  // ?edit=1: opened from the climber table's Edit link (#89).
  const startEditing = query.edit === "1";
  // getClimber is shared with /me, so it doesn't check for staff itself.
  // connection() first: the Supabase check reads the clock.
  await connection();
  await requireStaff();
  const climber = await getClimber(climberId);
  if (!climber) notFound();
  const waiver = await getStaffWaiverPanel(climber.id);
  const membership = MEMBERSHIP[climber.membershipStatus];
  const membershipLine = membershipDateLine(
    climber.membershipStatus,
    climber.membershipRenewsOn,
    climber.membershipRecurring,
  );

  return (
    <Card variant="outlined" sx={{ width: "100%", maxWidth: 560, borderRadius: 3 }}>
      <CardContent>
        {justAdded ? (
          <Alert severity="success" sx={{ mb: 4 }}>
            Climber added.
            {climber.waiverStatus !== "valid" ? " Next, their waiver." : null}
          </Alert>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              {climber.firstName} {climber.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Username{" "}
              <Box
                component="span"
                sx={{ fontFamily: "var(--font-geist-mono)", color: "text.primary" }}
              >
                {climber.username}
              </Box>
            </Typography>
          </div>
          {/* Straight to the POS with this climber picked (#148). */}
          <LinkButton href={`/desk/pos?climber=${climber.id}`} variant="outlined">
            Open in POS
          </LinkButton>
        </div>

        <Box sx={{ mt: 4 }}>
          <ClimberDetails
            // Remount with fresh details when the climber changes.
            key={climber.id}
            climberId={climber.id}
            startEditing={startEditing}
            details={{
              firstName: climber.firstName,
              lastName: climber.lastName,
              phone: climber.phone,
              email: climber.email,
              dateOfBirth: climber.dateOfBirth,
            }}
          >
            <div className="flex flex-col gap-3">
              <DeskWaiverPanel waiver={waiver} />
              <div className="flex flex-wrap items-center gap-3">
                <Typography variant="secondary">Membership</Typography>
                <StatusPill status={membership.status} label={membership.label} />
                {membershipLine ? (
                  // No date while paused (#124); "Runs until" for a one-off plan (#132).
                  <Typography
                    variant="secondary"
                    color={climber.membershipStatus === "expired" ? "error" : undefined}
                  >
                    {membershipLine}
                  </Typography>
                ) : null}
              </div>
            </div>
            {climber.waiverStatus !== "valid" ? (
              <WaiverStep
                climberId={climber.id}
                laterHref={justAdded ? "/desk/customers" : undefined}
              />
            ) : null}
          </ClimberDetails>
        </Box>
      </CardContent>
    </Card>
  );
}
