import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import StatusPill from "@/components/ui/StatusPill";
import { getSessionClimberId } from "@/features/auth/queries";
import LinkButton from "@/features/climbers/components/LinkButton";
import { getClimber } from "@/features/climbers/queries";

export default function RegistrationPage() {
  return (
    <Suspense fallback={<Typography variant="secondary">Loading registration…</Typography>}>
      <RegistrationDetails />
    </Suspense>
  );
}

async function RegistrationDetails() {
  // The gym-scoped customer read includes Prisma timestamps, so defer it
  // until a request arrives under cache components.
  await connection();
  const climberId = await getSessionClimberId();
  if (!climberId) redirect("/me/explore");
  const climber = await getClimber(climberId);
  if (!climber) redirect("/me/explore");

  return (
    <>
      <Typography variant="pageTitle">You&apos;re registered</Typography>
      <Card>
        <CardContent className="flex flex-col items-start gap-3">
          <StatusPill status="ok" label="Gym joined" />
          <Typography variant="body">
            Welcome, {climber.firstName}. Sign the waiver to finish getting ready to climb.
          </Typography>
          <LinkButton href="/me/waiver?next=/me" size="large">
            Sign waiver
          </LinkButton>
          <LinkButton href="/me" variant="outlined" size="large">
            Go to dashboard
          </LinkButton>
        </CardContent>
      </Card>
    </>
  );
}
