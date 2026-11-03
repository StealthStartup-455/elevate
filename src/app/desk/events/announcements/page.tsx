import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import { EventsTab } from "@/features/events/components/desk/DeskCalendar";

// Events tab: competitions, film nights and other announcements.
export default function DeskAnnouncementsPage() {
  return (
    <Suspense fallback={<Typography variant="secondary">Loading…</Typography>}>
      <EventsTab />
    </Suspense>
  );
}
