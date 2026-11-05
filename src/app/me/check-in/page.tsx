import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import CheckInCard from "@/features/check-ins/components/CheckInCard";

// Check in tab: the code the front desk scans (#101).
export default function CheckInPage() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <Typography variant="pageTitle">Check in</Typography>
        <Typography variant="secondary">Show this to the front desk</Typography>
      </div>
      <Suspense fallback={<Typography variant="secondary">Loading your code…</Typography>}>
        <CheckInCard />
      </Suspense>
    </>
  );
}
