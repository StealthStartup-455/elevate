// The desk's month calendar (#249): which days each class, event and set change is on, and what
// it says there. Pure, on the gym's clock like time.ts, so the server's zone never matters.
// The month grid itself is calendar.ts, shared with the climber's calendar.
import { addMonths, monthOf } from "./calendar";
import { eventEnd } from "./schedule";
import { addDays, formatClock, formatClockRange, gymClockAt, gymTime, MINUTES_PER_DAY } from "./time";

export type DeskCalendarKind = "class" | "event" | "setChange";

/** Someone signed up for a class, for the link to their account. */
export type SignedUp = { climberId: string; name: string };

/** A class, event or set change as it is stored. */
export type DeskCalendarEntry = {
  id: string;
  kind: DeskCalendarKind;
  title: string;
  details: string | null;
  startsAt: Date;
  /** Null for an event with no set end: it is on its first day only. */
  endsAt: Date | null;
  canceled: boolean;
  /** Classes only. */
  classInfo: { instructor: string | null; capacity: number; signedUp: SignedUp[] } | null;
};

/** An entry on one of its days. */
export type DeskCalendarItem = Omit<DeskCalendarEntry, "startsAt" | "endsAt"> & {
  /** That day's part of it: "6 PM – 7:30 PM", "From 9 AM", "All day" or "Until 2 PM". */
  time: string;
};

/**
 * The day to open from the page's address, or `today` when it isn't a real date. Years outside
 * 2000 to 2100 count as not real, so nothing out there is queried.
 */
export function parseDay(value: unknown, today: string): string {
  if (typeof value !== "string" || !/^(20\d\d|2100)-\d\d-\d\d$/.test(value)) return today;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : today;
}

/** Every day of a month, in order. */
export function daysOfMonth(month: string): string[] {
  const days: string[] = [];
  for (let day = `${month}-01`; monthOf(day) === month; day = addDays(day, 1)) days.push(day);
  return days;
}

/** The moments a month starts and ends (the next month's start) on the gym's clock. */
export function monthBounds(month: string, timeZone: string): { from: Date; to: Date } {
  return {
    from: gymTime(`${month}-01`, 0, timeZone),
    to: gymTime(`${addMonths(month, 1)}-01`, 0, timeZone),
  };
}

/** Where the month buttons go: today if it's in that month, else the 1st. */
export function dayInMonth(month: string, today: string): string {
  return monthOf(today) === month ? today : `${month}-01`;
}

/**
 * The first and last day something is on. Ending at midnight is still the day before, and an end
 * that isn't after the start counts as the start.
 */
function daySpan(startsAt: Date, endsAt: Date | null, timeZone: string) {
  const start = gymClockAt(startsAt, timeZone);
  const over = eventEnd(startsAt, endsAt, timeZone);
  const end = gymClockAt(over > startsAt ? over : startsAt, timeZone);
  if (end.day > start.day && end.minutes === 0) {
    return { start, end: { day: addDays(end.day, -1), minutes: MINUTES_PER_DAY } };
  }
  return { start, end };
}

/**
 * The month's entries by day ("2026-11-05"), each day in time order. Something that runs over
 * several days is on every day it covers. Days with nothing have no key.
 */
export function groupByDay(
  month: string,
  entries: DeskCalendarEntry[],
  timeZone: string,
): Record<string, DeskCalendarItem[]> {
  const placed: Record<string, { from: number; item: DeskCalendarItem }[]> = {};
  const first = `${month}-01`;
  for (const { startsAt, endsAt, ...entry } of entries) {
    const { start, end } = daySpan(startsAt, endsAt, timeZone);
    // Skip straight to this month, however long ago it started.
    for (let day = start.day > first ? start.day : first; day <= end.day && monthOf(day) === month; day = addDays(day, 1)) {
      const starts = day === start.day;
      const ends = day === end.day;
      const time =
        starts && ends
          ? endsAt && endsAt > startsAt
            ? formatClockRange(start.minutes, end.minutes)
            : formatClock(start.minutes)
          : starts
            ? `From ${formatClock(start.minutes)}`
            : ends && end.minutes < MINUTES_PER_DAY
              ? `Until ${formatClock(end.minutes)}`
              : "All day";
      (placed[day] ??= []).push({ from: starts ? start.minutes : 0, item: { ...entry, time } });
    }
  }
  return Object.fromEntries(
    Object.entries(placed).map(([day, list]) => [
      day,
      list
        .sort((a, b) => a.from - b.from || a.item.title.localeCompare(b.item.title) || a.item.id.localeCompare(b.item.id))
        .map((p) => p.item),
    ]),
  );
}

/** Items still on, by kind: what a day's cell marks. Canceled ones only show in the day's list. */
export function countByKind(items: DeskCalendarItem[]): Record<DeskCalendarKind, number> {
  const counts = { class: 0, event: 0, setChange: 0 };
  for (const item of items) if (!item.canceled) counts[item.kind] += 1;
  return counts;
}

/** Where a key moves the focus on the grid, or null for any other key. */
export function dayForKey(key: string, day: string, weekday: number): string | null {
  switch (key) {
    case "ArrowLeft":
      return addDays(day, -1);
    case "ArrowRight":
      return addDays(day, 1);
    case "ArrowUp":
      return addDays(day, -7);
    case "ArrowDown":
      return addDays(day, 7);
    case "Home":
      return addDays(day, -weekday);
    case "End":
      return addDays(day, 6 - weekday);
    case "PageUp":
    case "PageDown": {
      // The same date a month away, or that month's last day when it's shorter.
      const days = daysOfMonth(addMonths(monthOf(day), key === "PageUp" ? -1 : 1));
      return days[Math.min(Number(day.slice(8)), days.length) - 1];
    }
    default:
      return null;
  }
}
