"use client";

import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export type CalendarView = "classes" | "events" | "calendar";

// The Classes | Events | Calendar switch at the top of the Classes tab. All three are rendered
// on the server; this only shows one. The choice goes in the URL (?view=events,
// ?view=calendar), so Home's "See all events" opens the right one and a reload keeps it.
export default function ClassesOrEvents({
  initial,
  classes,
  events,
  calendar,
}: {
  initial: CalendarView;
  classes: React.ReactNode;
  events: React.ReactNode;
  calendar: React.ReactNode;
}) {
  const [view, setView] = useState<CalendarView>(initial);
  const router = useRouter();
  const pathname = usePathname();

  function choose(next: CalendarView | null) {
    if (!next) return;
    setView(next);
    router.replace(next === "classes" ? pathname : `${pathname}?view=${next}`, { scroll: false });
  }

  return (
    <>
      <ToggleButtonGroup exclusive fullWidth value={view} onChange={(_, next) => choose(next)} aria-label="Show">
        <ToggleButton value="classes">Classes</ToggleButton>
        <ToggleButton value="events">Events</ToggleButton>
        <ToggleButton value="calendar">Calendar</ToggleButton>
      </ToggleButtonGroup>
      <div hidden={view !== "classes"}>{classes}</div>
      <div hidden={view !== "events"}>{events}</div>
      <div hidden={view !== "calendar"}>{calendar}</div>
    </>
  );
}
