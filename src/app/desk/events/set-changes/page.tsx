import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import { SetChangesTab } from "@/features/events/components/desk/DeskCalendar";

// Set changes tab: wall resets.
export default function DeskSetChangesPage() {
  return (
    <Suspense fallback={<Typography variant="secondary">Loading…</Typography>}>
      <SetChangesTab />
    </Suspense>
  );
}
