import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import EventsTabs, { EventsTabsView } from "@/features/events/components/desk/EventsTabs";

// The desk's Calendar page ("Calendar" in the menu, #244): the calendar, hours, class types, classes, set changes and events, one tab each.
export default function DeskEventsLayout({ children }: LayoutProps<"/desk/events">) {
  return (
    <div className="flex flex-col gap-3">
      <Typography variant="pageTitle">Calendar</Typography>
      <Suspense fallback={<EventsTabsView current={false} />}>
        <EventsTabs />
      </Suspense>
      {children}
    </div>
  );
}
