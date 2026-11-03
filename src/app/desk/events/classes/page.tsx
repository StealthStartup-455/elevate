import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import { ClassesTab } from "@/features/events/components/desk/DeskCalendar";

// Classes tab: sessions of the class types, with who signed up.
export default function DeskClassesPage() {
  return (
    <Suspense fallback={<Typography variant="secondary">Loading…</Typography>}>
      <ClassesTab />
    </Suspense>
  );
}
