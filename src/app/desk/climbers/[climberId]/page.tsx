import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireStaff } from "@/features/auth/staff";
import ClimberDetails from "@/features/climbers/components/ClimberDetails";
import LinkButton from "@/features/climbers/components/LinkButton";
import WaiverBadge from "@/features/climbers/components/WaiverBadge";
import WaiverStep from "@/features/climbers/components/WaiverStep";
import { formatDate } from "@/features/climbers/format";
import { getClimber } from "@/features/climbers/queries";

export default function ClimberPage({
  params,
  searchParams,
}: PageProps<"/desk/climbers/[climberId]">) {
  return (
    <div className="mx-auto flex w-full max-w-narrow flex-col gap-4 sm:gap-6">
      <div className="flex flex-col items-start">
        <LinkButton href="/desk/climbers" variant="text">
          ← Climbers
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
}: Pick<PageProps<"/desk/climbers/[climberId]">, "params" | "searchParams">) {
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

  return (
    <Card variant="outlined" sx={{ width: "100%", maxWidth: 560, borderRadius: 3 }}>
      <CardContent>
        {justAdded ? (
          <Alert severity="success" sx={{ mb: 4 }}>
            Climber added.
            {climber.waiverStatus !== "valid" ? " Next, their waiver." : null}
          </Alert>
        ) : null}
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
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Waiver
              </Typography>
              <WaiverBadge status={climber.waiverStatus} />
              {climber.waiverExpiresOn ? (
                <Typography variant="body2" color="text.secondary">
                  {climber.waiverStatus === "valid" ? "Expires" : "Expired"}{" "}
                  {formatDate(climber.waiverExpiresOn, true)}
                </Typography>
              ) : null}
              {/* Placeholder until the waivers feature exists. */}
              <Button variant="outlined" size="small" disabled title="Coming soon">
                Look at waiver
              </Button>
            </Box>
            {climber.waiverStatus !== "valid" ? (
              <WaiverStep
                climberId={climber.id}
                laterHref={justAdded ? "/desk/climbers" : undefined}
              />
            ) : null}
          </ClimberDetails>
        </Box>
      </CardContent>
    </Card>
  );
}
