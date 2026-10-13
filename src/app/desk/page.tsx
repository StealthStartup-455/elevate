import { Suspense } from "react";
import FrontDeskBusyness from "@/features/analytics/components/FrontDeskBusyness";
import { DEMO_GYM_ID } from "@/features/analytics/config";

export default function DeskPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Front desk</h1>
      <Suspense fallback={<p>Loading busyness...</p>}>
        <FrontDeskBusyness gymId={DEMO_GYM_ID} />
      </Suspense>
    </div>
  );
}
