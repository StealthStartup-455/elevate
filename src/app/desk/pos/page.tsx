import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPosClimber } from "@/features/pos/actions";
import PointOfSale from "@/features/pos/components/PointOfSale";
import TodaysSales from "@/features/pos/components/TodaysSales";
import { getPosData } from "@/features/pos/queries";

// The desk POS: sell passes, memberships, rentals and chalk to one climber,
// charged on the gym's own card machine (elevate-docs#56).
export default function PosPage({ searchParams }: PageProps<"/desk/pos">) {
  return (
    <div className="flex flex-col gap-3">
      <Typography variant="pageTitle">Point of sale</Typography>
      <Suspense fallback={<p>Loading the POS...</p>}>
        <Pos searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Pos({ searchParams }: Pick<PageProps<"/desk/pos">, "searchParams">) {
  const data = await getPosData();
  // A gym that sells through Rock Gym Pro or Redpoint has no POS here.
  if (!data) notFound();

  // ?climber=<id>: opened from "Sell" on a climber's page (#148). An id that
  // isn't a climber of this gym (or isn't an id at all) opens POS with nobody
  // picked, like getPosClimber does for any bad id.
  const { climber } = await searchParams;
  const picked = typeof climber === "string" ? await getPosClimber(climber) : null;

  return (
    <>
      <PointOfSale
        // A different ?climber gives a fresh POS, with a fresh cart.
        key={picked?.id ?? "nobody"}
        initialClimber={picked}
        checkedInToday={data.checkedInToday}
        renewalsDue={data.renewalsDue}
        products={data.products}
        taxRates={data.taxRates}
      />
      <TodaysSales sales={data.sales} />
    </>
  );
}
