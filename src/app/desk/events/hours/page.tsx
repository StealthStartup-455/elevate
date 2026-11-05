import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import { HoursTab } from "@/features/events/components/desk/DeskCalendar";

// Hours tab: the regular week and special days.
export default function DeskHoursPage() {
  return (
    <Suspense fallback={<Typography variant="secondary">Loading…</Typography>}>
      <HoursTab />
    </Suspense>
  );
}
