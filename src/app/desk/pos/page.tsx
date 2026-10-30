import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PointOfSale from "@/features/pos/components/PointOfSale";
import TodaysSales from "@/features/pos/components/TodaysSales";
import { getPosData } from "@/features/pos/queries";

// The desk POS: sell passes, memberships, rentals and chalk to one climber,
// charged on the gym's own card machine (elevate-docs#56).
export default function PosPage() {
  return (
    <div className="flex flex-col gap-3">
      <Typography variant="pageTitle">Point of sale</Typography>
      <Suspense fallback={<p>Loading the POS...</p>}>
        <Pos />
      </Suspense>
    </div>
  );
}

async function Pos() {
  const data = await getPosData();
  // A gym that sells through Rock Gym Pro or Redpoint has no POS here.
  if (!data) notFound();
  return (
    <>
      <PointOfSale
        climbers={data.climbers}
        checkedInToday={data.checkedInToday}
        renewalsDue={data.renewalsDue}
        products={data.products}
        taxRateBps={data.taxRateBps}
      />
      <TodaysSales sales={data.sales} />
    </>
  );
}
