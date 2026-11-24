import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import { isDemoMode } from "@/features/auth/demo-mode";
import MetricsDashboard from "@/features/metrics/components/MetricsDashboard";
import { getValuePropMetrics } from "@/features/metrics/queries";

// Whether Elevate is delivering its value propositions, front desk speed first
// (#251). Managers and owners only; the query checks the role next to the data.
export default function MetricsPage() {
  return (
    <div className="flex flex-col gap-3">
      <Typography variant="pageTitle">Metrics</Typography>
      <Suspense fallback={<Typography variant="body">Loading the metrics...</Typography>}>
        <Metrics />
      </Suspense>
    </div>
  );
}

async function Metrics() {
  const data = await getValuePropMetrics();
  if (!data) return <Alert severity="info">Only managers and owners can see metrics.</Alert>;
  return <MetricsDashboard data={data} demo={isDemoMode()} />;
}
