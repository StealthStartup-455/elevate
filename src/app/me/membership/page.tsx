import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import AccountCard from "@/features/auth/components/AccountCard";
import { getMyMembership } from "@/features/climbers/queries";
import PlanCard from "@/features/purchase/components/PlanCard";
import PurchaseHistory from "@/features/purchase/components/PurchaseHistory";
import PurchaseOptions from "@/features/purchase/components/PurchaseOptions";
import { getPurchasePage } from "@/features/purchase/queries";
import WaiverCard from "@/features/waivers/components/WaiverCard";

// Membership tab: the plan, the waiver, buying passes, rentals and chalk (when the gym sells in
// the app, elevate-docs#58), purchase history and logging out (#101).
export default function MembershipPage() {
  return (
    <Suspense fallback={<Typography variant="pageTitle">Membership</Typography>}>
      <Membership />
    </Suspense>
  );
}

async function Membership() {
  // Null when buying in the app is off (outside demo mode, or a gym on Rock Gym Pro or Redpoint).
  const [membership, purchase] = await Promise.all([getMyMembership(), getPurchasePage()]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Typography variant="pageTitle">Membership</Typography>
        {purchase ? <PurchaseHistory purchases={purchase.purchases} /> : null}
      </div>
      <PlanCard
        membership={membership}
        current={purchase?.current}
        upcoming={purchase?.upcoming}
        canPurchase={purchase !== null}
      />
      <Suspense fallback={null}>
        <WaiverCard />
      </Suspense>
      {purchase ? (
        <PurchaseOptions
          products={purchase.products}
          rates={purchase.rates}
          context={{
            membershipStatus: purchase.membership.status,
            coveredUntil: purchase.coveredUntil,
            hasDayPass: purchase.membership.hasDayPass,
          }}
        />
      ) : null}
      <Suspense fallback={null}>
        <AccountCard />
      </Suspense>
    </>
  );
}
