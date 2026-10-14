import { Suspense } from "react";
import FrontDeskBusyness from "@/features/analytics/components/FrontDeskBusyness";
import { DEMO_GYM_ID } from "@/features/analytics/config";
import LinkButton from "@/features/climbers/components/LinkButton";
import ManualCheckInButton from "@/features/climbers/components/ManualCheckInButton";

export default function DeskPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Front desk</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <ManualCheckInButton />
          </Suspense>
          <LinkButton href="/desk/climbers/new">Add climber</LinkButton>
        </div>
      </div>
      <Suspense fallback={<p>Loading busyness...</p>}>
        <FrontDeskBusyness gymId={DEMO_GYM_ID} />
      </Suspense>
    </div>
  );
}
