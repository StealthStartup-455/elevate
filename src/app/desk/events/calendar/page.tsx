import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import DeskMonth from "@/features/events/components/desk/DeskMonth";

// Calendar tab: a month of what's on, and who's registered. ?day=2026-11-05 opens a day.
export default function DeskCalendarPage({ searchParams }: PageProps<"/desk/events/calendar">) {
  return (
    <Suspense fallback={<Typography variant="secondary">Loading…</Typography>}>
      <DeskMonth searchParams={searchParams} />
    </Suspense>
  );
}
