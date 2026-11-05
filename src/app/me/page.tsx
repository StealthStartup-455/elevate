import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import LinkArrow from "@/components/ui/LinkArrow";
import { connection } from "next/server";
import { Suspense } from "react";
import { VersionLink } from "@/components/ui/AppVersion";
import CustomerBusyness from "@/features/analytics/components/CustomerBusyness";
import { getSessionClimberId } from "@/features/auth/queries";
import ReadyToClimb from "@/features/climbers/components/ReadyToClimb";
import { getMyMembership } from "@/features/climbers/queries";
import EventBanner from "@/features/events/components/EventBanner";
import SetChanges from "@/features/events/components/SetChanges";
import BankAccountCard from "@/features/eft/components/BankAccountCard";

// Home tab: who's signed in, an event coming up, anything stopping them climbing, then
// whether the gym is open and how busy it is, the week's hours and the set changes (#101).
export default function HomePage() {
  return (
    <Suspense fallback={<Typography variant="pageTitle">Home</Typography>}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  // Membership data reaches Prisma timestamps, so this must run after a real
  // request rather than during the cache-component prerender.
  await connection();
  if (!(await getSessionClimberId())) {
    return (
      <>
        <Typography variant="pageTitle">Welcome to Elevate</Typography>
        <Card>
          <CardContent className="flex flex-col items-start gap-2">
            <Typography variant="body">Find a gym whenever you&apos;re ready to start climbing.</Typography>
            <LinkArrow href="/me/explore">Explore gyms</LinkArrow>
          </CardContent>
        </Card>
      </>
    );
  }
  const membership = await getMyMembership();
  return (
    <>
      <Greeting membership={membership} />
      {/* Only there while an event is coming up. */}
      <Suspense fallback={null}>
        <EventBanner />
      </Suspense>
      {/* EFT for a monthly membership, a mock (#179). */}
      <Suspense fallback={null}>
        <BankAccountCard />
      </Suspense>
      <Suspense fallback={null}>
        <ReadyToClimb />
      </Suspense>
      <Suspense fallback={<Typography variant="secondary">Loading hours…</Typography>}>
        <CustomerBusyness gymId={membership.gymId} />
      </Suspense>
      <Suspense fallback={null}>
        <SetChanges />
      </Suspense>
      {/* Where climbers find the version, rather than a footer on every page (#103). */}
      <Typography variant="secondary" component="p" sx={{ textAlign: "center" }}>
        About: Elevate <VersionLink />
      </Typography>
    </>
  );
}

// Who is signed in, for someone sharing a phone or switching between logins (#144).
function Greeting({
  membership,
}: {
  membership: Awaited<ReturnType<typeof getMyMembership>>;
}) {
  const { firstName, lastName } = membership;
  return (
    <div className="flex flex-col gap-1">
      <Typography variant="pageTitle">Hi, {firstName}</Typography>
      <Typography variant="secondary">
        Signed in as {firstName} {lastName}
      </Typography>
    </div>
  );
}
