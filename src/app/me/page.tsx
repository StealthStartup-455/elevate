import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import { VersionLink } from "@/components/ui/AppVersion";
import CustomerBusyness from "@/features/analytics/components/CustomerBusyness";
import { DEMO_GYM_ID } from "@/features/analytics/config";
import ReadyToClimb from "@/features/climbers/components/ReadyToClimb";
import { getMyMembership } from "@/features/climbers/queries";
import EventBanner from "@/features/events/components/EventBanner";
import SetChanges from "@/features/events/components/SetChanges";
import BankAccountCard from "@/features/eft/components/BankAccountCard";

// Home tab: who's signed in, an event coming up, anything stopping them climbing, then
// whether the gym is open and how busy it is, the week's hours and the set changes (#101).
export default function HomePage() {
  return (
    <>
      <Suspense fallback={<Typography variant="pageTitle">Home</Typography>}>
        <Greeting />
      </Suspense>
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
        <CustomerBusyness gymId={DEMO_GYM_ID} />
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
async function Greeting() {
  const { firstName, lastName } = await getMyMembership();
  return (
    <div className="flex flex-col gap-1">
      <Typography variant="pageTitle">Hi, {firstName}</Typography>
      <Typography variant="secondary">
        Signed in as {firstName} {lastName}
      </Typography>
    </div>
  );
}
