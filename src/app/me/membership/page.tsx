import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import BuyMembership from "@/features/membership/components/BuyMembership";
import MyPlan from "@/features/membership/components/MyPlan";
import PurchaseHistory from "@/features/membership/components/PurchaseHistory";
import { getMembershipPage } from "@/features/membership/queries";

// The climber's own Membership tab: their plan and waiver, the same passes
// and memberships the desk sells, and what they've bought (elevate-docs#58).
export default function MembershipPage() {
  return (
    <div className="mx-auto flex w-full max-w-narrow flex-col gap-4 sm:gap-6">
      <Typography variant="pageTitle">Membership</Typography>
      <Suspense fallback={<p>Loading your membership...</p>}>
        <Membership />
      </Suspense>
    </div>
  );
}

async function Membership() {
  const data = await getMembershipPage();
  // A gym that sells through Rock Gym Pro or Redpoint has no purchase here.
  if (!data) notFound();
  return (
    <>
      <MyPlan data={data} />
      <BuyMembership
        products={data.products}
        taxRateBps={data.taxRateBps}
        context={{
          membershipStatus: data.membership.status,
          coveredUntil: data.coveredUntil,
          hasDayPass: data.membership.hasDayPass,
        }}
      />
      <PurchaseHistory purchases={data.purchases} />
    </>
  );
}
