import { Suspense } from "react";
import CustomerBusyness from "@/features/analytics/components/CustomerBusyness";
import { DEMO_GYM_ID } from "@/features/analytics/config";
import MembershipCard from "@/features/climbers/components/MembershipCard";

export default function MePage() {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4 sm:gap-6">
      <h1 className="text-2xl font-semibold">My dashboard</h1>
      <Suspense fallback={<p>Loading membership...</p>}>
        <MembershipCard />
      </Suspense>
      <Suspense fallback={<p>Loading busyness...</p>}>
        <CustomerBusyness gymId={DEMO_GYM_ID} />
      </Suspense>
    </div>
  );
}
