import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { updateClimber } from "@/features/climbers/actions";
import ClimberForm from "@/features/climbers/components/ClimberForm";
import LinkButton from "@/features/climbers/components/LinkButton";
import WaiverBadge from "@/features/climbers/components/WaiverBadge";
import WaiverStep from "@/features/climbers/components/WaiverStep";
import { formatDate } from "@/features/climbers/format";
import { usernameFor } from "@/features/auth/mock-users";
import { getClimber } from "@/features/climbers/queries";

export default function ClimberPage({
  params,
}: PageProps<"/desk/climbers/[climberId]">) {
  return (
    <div className="mx-auto flex w-full max-w-narrow flex-col gap-4 sm:gap-6">
      <div className="flex flex-col items-start">
        <LinkButton href="/desk/climbers" variant="text">
          ← Climbers
        </LinkButton>
      </div>
      <Suspense fallback={<p>Loading...</p>}>
        <ClimberDetails params={params} />
      </Suspense>
    </div>
  );
}

async function ClimberDetails({
  params,
}: Pick<PageProps<"/desk/climbers/[climberId]">, "params">) {
  const { climberId } = await params;
  const climber = await getClimber(climberId);
  if (!climber) notFound();

  return (
    <Card variant="outlined" sx={{ width: "100%", maxWidth: 560, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          {climber.firstName} {climber.lastName}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Username{" "}
          <Box
            component="span"
            sx={{ fontFamily: "var(--font-geist-mono)", color: "text.primary" }}
          >
            {usernameFor(climber)}
          </Box>
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 3,
            mt: 3,
            mb: 5,
          }}
        >
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
          <Box sx={{ mb: 5 }}>
            <WaiverStep climberId={climber.id} />
          </Box>
        ) : null}

        <ClimberForm
          // Remount with fresh defaults when the climber changes.
          key={climber.id}
          action={updateClimber.bind(null, climber.id)}
          defaults={{
            firstName: climber.firstName,
            lastName: climber.lastName,
            phone: climber.phone,
            dateOfBirth: climber.dateOfBirth,
          }}
          submitLabel="Save changes"
        />
      </CardContent>
    </Card>
  );
}
