import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import DeskCalendar from "@/features/events/components/desk/DeskCalendar";

export default function DeskEventsPage() {
  return (
    <div className="flex flex-col gap-3">
      <Typography variant="pageTitle">Hours and events</Typography>
      <Suspense fallback={<p>Loading the calendar...</p>}>
        <DeskCalendar />
      </Suspense>
    </div>
  );
}
