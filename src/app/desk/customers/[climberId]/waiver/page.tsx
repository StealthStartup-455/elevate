import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import LinkArrow from "@/components/ui/LinkArrow";
import StatusPill from "@/components/ui/StatusPill";
import { requireStaff } from "@/features/auth/staff";
import { formatDate } from "@/features/climbers/format";
import { getClimber } from "@/features/climbers/queries";
import WaiverForm from "@/features/waivers/components/WaiverForm";
import { getCurrentWaiverTemplate, getWaiverStatus } from "@/features/waivers/queries";
import { ADULT_AGE, ageOn } from "@/features/waivers/validate";

// Staff sign the waiver with a climber at the desk. It's the same form the
// climber gets on /me/waiver (wording, ticks, emergency contact, signature),
// so the desk can't mark a waiver valid without one (#131, #210).
export default function DeskWaiverSignPage({
  params,
}: PageProps<"/desk/customers/[climberId]/waiver">) {
  return (
    <div className="mx-auto flex w-full max-w-narrow flex-col gap-3">
      <Typography variant="pageTitle">Waiver</Typography>
      <Suspense fallback={<Typography variant="secondary">Loading waiver…</Typography>}>
        <SignWaiver params={params} />
      </Suspense>
    </div>
  );
}

async function SignWaiver({
  params,
}: Pick<PageProps<"/desk/customers/[climberId]/waiver">, "params">) {
  const { climberId } = await params;
  // connection() first: the Supabase check reads the clock.
  await connection();
  await requireStaff();
  const climber = await getClimber(climberId);
  if (!climber) notFound();
  const [template, status] = await Promise.all([
    getCurrentWaiverTemplate(),
    getWaiverStatus(climber.id),
  ]);
  const back = `/desk/customers/${climber.id}`;

  if (!template) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-2">
          <Typography variant="body">
            This gym hasn&apos;t set up its waiver yet. Add the wording under Waivers first.
          </Typography>
          <LinkArrow href={back}>Back</LinkArrow>
        </CardContent>
      </Card>
    );
  }

  // Also what staff see straight after signing: the action refreshes this page.
  if (status.status === "valid" && status.waiverId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-2">
          <StatusPill status="ok" label="Waiver signed" />
          <Typography variant="body">
            {climber.firstName} is all set until {formatDate(status.expiresOn!, true)}.
          </Typography>
          <LinkArrow href={`/desk/waivers/${status.waiverId}`}>Look at waiver</LinkArrow>
          <LinkArrow href={back}>Back to {climber.firstName}</LinkArrow>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <LinkArrow href={back}>Back to {climber.firstName}</LinkArrow>
      <WaiverForm
        template={template}
        climber={{
          id: climber.id,
          fullName: `${climber.firstName} ${climber.lastName}`,
          dateOfBirth: climber.dateOfBirth,
          isMinor: ageOn(climber.dateOfBirth, new Date()) < ADULT_AGE,
        }}
        expired={status.status === "expired"}
      />
    </>
  );
}
