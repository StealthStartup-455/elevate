import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { connection } from "next/server";
import { Suspense } from "react";
import GymSearch from "@/features/gyms/components/GymSearch";
import { listGymsForCustomer } from "@/features/gyms/queries";

export default function ExploreGymsPage() {
  return (
    <>
      <Typography variant="pageTitle">Explore gyms</Typography>
      <Card>
        <CardContent>
          <Typography variant="cardTitle">Find your gym</Typography>
          <Typography variant="secondary" sx={{ mt: 1, mb: 3 }}>
            Search Elevate gyms, then join the ones where you climb.
          </Typography>
          <Suspense fallback={<Typography variant="secondary">Loading gyms…</Typography>}>
            <GymList />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}

async function GymList() {
  // This customer-specific Prisma query includes timestamped records, so it
  // must wait for the incoming request under cache components.
  await connection();
  const gyms = await listGymsForCustomer();
  return <GymSearch initialGyms={gyms} />;
}
