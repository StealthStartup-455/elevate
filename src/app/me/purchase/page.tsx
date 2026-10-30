import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import MyPlan from "@/features/purchase/components/MyPlan";
import PurchaseHistory from "@/features/purchase/components/PurchaseHistory";
import PurchaseOptions from "@/features/purchase/components/PurchaseOptions";
import { getPurchasePage } from "@/features/purchase/queries";

// The climber's own Purchase tab: their plan and waiver, a Membership section
// for those without one, rentals and chalk for everyone, and a Purchase history
// button (elevate-docs#58).
export default function PurchasePage() {
  return (
    <div className="mx-auto flex w-full max-w-narrow flex-col gap-4 sm:gap-6">
      <Suspense fallback={<Typography variant="pageTitle">Purchase</Typography>}>
        <Purchase />
      </Suspense>
    </div>
  );
}

async function Purchase() {
  const data = await getPurchasePage();
  // A gym that sells through Rock Gym Pro or Redpoint has no purchase here.
  if (!data) notFound();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Typography variant="pageTitle">Purchase</Typography>
        <PurchaseHistory purchases={data.purchases} />
      </div>
      <MyPlan data={data} />
      <PurchaseOptions
        products={data.products}
        rates={data.rates}
        context={{
          membershipStatus: data.membership.status,
          coveredUntil: data.coveredUntil,
          hasDayPass: data.membership.hasDayPass,
        }}
      />
    </>
  );
}
