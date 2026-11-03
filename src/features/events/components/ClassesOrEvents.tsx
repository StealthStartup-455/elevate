"use client";

import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export type CalendarView = "classes" | "events";

// The Classes | Events switch at the top of the Classes tab. Both lists are rendered on the
// server; this only shows one. The choice goes in the URL (?view=events), so Home's "See all
// events" opens the right one and a reload keeps it.
export default function ClassesOrEvents({
  initial,
  classes,
  events,
}: {
  initial: CalendarView;
  classes: React.ReactNode;
  events: React.ReactNode;
}) {
  const [view, setView] = useState<CalendarView>(initial);
  const router = useRouter();
  const pathname = usePathname();

  function choose(next: CalendarView | null) {
    if (!next) return;
    setView(next);
    router.replace(next === "events" ? `${pathname}?view=events` : pathname, { scroll: false });
  }

  return (
    <>
      <ToggleButtonGroup exclusive fullWidth value={view} onChange={(_, next) => choose(next)} aria-label="Show">
        <ToggleButton value="classes">Classes</ToggleButton>
        <ToggleButton value="events">Events</ToggleButton>
      </ToggleButtonGroup>
      <div hidden={view !== "classes"}>{classes}</div>
      <div hidden={view !== "events"}>{events}</div>
    </>
  );
}
