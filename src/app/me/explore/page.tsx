import Card from "@mui/material/Card";
import Alert from "@mui/material/Alert";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { connection } from "next/server";
import { Suspense } from "react";
import GymSearch from "@/features/gyms/components/GymSearch";
import { listGymsForCustomer } from "@/features/gyms/queries";

type Props = { searchParams: Promise<{ error?: string }> };

export default function ExploreGymsPage({ searchParams }: Props) {
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
            <GymList searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}

async function GymList({ searchParams }: Props) {
  // This customer-specific Prisma query includes timestamped records, so it
  // must wait for the incoming request under cache components.
  await connection();
  const { error } = await searchParams;
  const gyms = await listGymsForCustomer();
  return (
    <>
      {error === "student-id-taken" ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Another climber already has this student ID at that gym. Ask the front desk for help.
        </Alert>
      ) : null}
      <GymSearch initialGyms={gyms} />
    </>
  );
}
