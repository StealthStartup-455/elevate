import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import { VersionLink } from "@/components/ui/AppVersion";
import CustomerBusyness from "@/features/analytics/components/CustomerBusyness";
import { DEMO_GYM_ID } from "@/features/analytics/config";
import MembershipCard from "@/features/climbers/components/MembershipCard";

export default function MePage() {
  return (
    <div className="mx-auto flex w-full max-w-narrow flex-col gap-4 sm:gap-6">
      <Typography variant="pageTitle">My dashboard</Typography>
      <Suspense fallback={<p>Loading membership...</p>}>
        <MembershipCard />
      </Suspense>
      <Suspense fallback={<p>Loading busyness...</p>}>
        <CustomerBusyness gymId={DEMO_GYM_ID} />
      </Suspense>
      {/* Where climbers find the version, rather than a footer on every page (#103). */}
      <Typography variant="secondary" component="p">
        About: Elevate <VersionLink />
      </Typography>
    </div>
  );
}
