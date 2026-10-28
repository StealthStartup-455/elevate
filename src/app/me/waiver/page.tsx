import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import LinkArrow from "@/components/ui/LinkArrow";
import StatusPill from "@/components/ui/StatusPill";
import { getSessionClimberId } from "@/features/auth/queries";
import { getClimber } from "@/features/climbers/queries";
import { formatDate } from "@/features/climbers/format";
import WaiverForm from "@/features/waivers/components/WaiverForm";
import { getCurrentWaiverTemplate, getWaiverStatus } from "@/features/waivers/queries";
import { ADULT_AGE, ageOn } from "@/features/waivers/validate";

// Where to go after signing. Only paths inside the app, so a link can't send
// someone to another site.
function safeNext(value: string | string[] | undefined): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/me";
}

export default function WaiverPage({ searchParams }: PageProps<"/me/waiver">) {
  return (
    <div className="mx-auto flex w-full max-w-narrow flex-col gap-3">
      <Typography variant="pageTitle">Waiver</Typography>
      <Suspense fallback={<Typography variant="secondary">Loading waiver…</Typography>}>
        <WaiverDetails searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function WaiverDetails({ searchParams }: Pick<PageProps<"/me/waiver">, "searchParams">) {
  const next = safeNext((await searchParams).next);
  const climberId = await getSessionClimberId();
  if (!climberId) redirect("/");
  const [climber, template, status] = await Promise.all([
    getClimber(climberId),
    getCurrentWaiverTemplate(),
    getWaiverStatus(climberId),
  ]);
  if (!climber) redirect("/");

  if (!template) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-2">
          <Typography variant="body">
            Your gym hasn&apos;t set up its online waiver yet. Ask at the front desk.
          </Typography>
          <LinkArrow href={next}>Back</LinkArrow>
        </CardContent>
      </Card>
    );
  }

  // Also what they see straight after signing: the action refreshes this page.
  if (status.status === "valid" && status.waiverId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-2">
          <StatusPill status="ok" label="Waiver signed" />
          <Typography variant="body">
            You&apos;re all set until {formatDate(status.expiresOn!, true)}.
          </Typography>
          <LinkArrow href={`/me/waiver/${status.waiverId}`}>View your waiver</LinkArrow>
          <LinkArrow href={next}>Continue</LinkArrow>
        </CardContent>
      </Card>
    );
  }

  return (
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
  );
}
