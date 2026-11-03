import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import { ClassTypesTab } from "@/features/events/components/desk/DeskCalendar";

// Class types tab: the kinds of class the gym runs.
export default function DeskClassTypesPage() {
  return (
    <Suspense fallback={<Typography variant="secondary">Loading…</Typography>}>
      <ClassTypesTab />
    </Suspense>
  );
}
