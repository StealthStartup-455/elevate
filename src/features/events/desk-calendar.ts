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
  /** Staff with a shift on it: who teaches the class, runs the event or sets the wall. */
  staff?: string[];
};

/** An entry on one of its days. */
export type DeskCalendarItem = Omit<DeskCalendarEntry, "startsAt" | "endsAt"> & {
  /** That day's part of it: "6 PM – 7:30 PM", "From 9 AM", "All day" or "Until 2 PM". */
  time: string;
  /** Minutes after midnight that day's part starts and ends, for the day's timeline. */
  from: number;
  to: number;
  /** On the whole day (the middle of something over several days): it goes above the timeline. */
  allDay: boolean;
};

/** The kinds of shift, as stored (ShiftKind). */
export type DeskShiftKind = "DESK" | "COACHING" | "CLASS" | "SETTING" | "EVENT";

/** A staff shift as it is stored, with what it is for. */
export type DeskShiftEntry = {
  id: string;
  staffName: string;
  kind: DeskShiftKind;
  startsAt: Date;
  endsAt: Date;
  /** The class, event or wall it is for, if any. */
  forTitle: string | null;
  note: string | null;
  canceled: boolean;
};

/** A shift on its day. */
export type DeskShift = Omit<DeskShiftEntry, "startsAt" | "endsAt"> & { time: string; from: number; to: number };

/** Something placed on the day's timeline: its column, out of how many sit side by side. */
export type Placed<T> = { item: T; column: number; columns: number };

/** An event with no set end shows as an hour on the timeline. */
const POINT_MINUTES = 60;

/**
 * The least time a block takes on the timeline, so a short one is tall enough to read. Laying
 * out and drawing both use it, so blocks that look like they overlap sit side by side.
 */
export const MIN_BLOCK_MINUTES = 30;

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
      const from = starts ? start.minutes : 0;
      const to = !ends ? MINUTES_PER_DAY : endsAt && endsAt > startsAt ? end.minutes : Math.min(from + POINT_MINUTES, MINUTES_PER_DAY);
      const allDay = !starts && (!ends || end.minutes >= MINUTES_PER_DAY);
      (placed[day] ??= []).push({ from, item: { ...entry, time, from, to: Math.max(to, from), allDay } });
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

/**
 * The month's shifts by day, each day in time order. A shift goes on the day it starts; one past
 * midnight stops at the end of that day.
 */
export function shiftsByDay(month: string, shifts: DeskShiftEntry[], timeZone: string): Record<string, DeskShift[]> {
  const byDay: Record<string, DeskShift[]> = {};
  for (const { startsAt, endsAt, ...shift } of shifts) {
    const start = gymClockAt(startsAt, timeZone);
    if (monthOf(start.day) !== month) continue;
    const end = gymClockAt(endsAt, timeZone);
    const to = end.day === start.day ? Math.max(end.minutes, start.minutes) : MINUTES_PER_DAY;
    (byDay[start.day] ??= []).push({ ...shift, from: start.minutes, to, time: formatClockRange(start.minutes, to) });
  }
  for (const list of Object.values(byDay)) {
    list.sort((a, b) => a.from - b.from || a.to - b.to || a.staffName.localeCompare(b.staffName));
  }
  return byDay;
}

/**
 * Lays out a day's timeline like a calendar app: things that overlap sit side by side, each in the
 * first column free when it starts; a group that overlaps shares one column count.
 */
export function layoutDay<T extends { from: number; to: number }>(items: T[]): Placed<T>[] {
  const sorted = [...items].sort((a, b) => a.from - b.from || b.to - a.to);
  const placed: Placed<T>[] = [];
  let group: Placed<T>[] = [];
  let groupEnd = -1;
  let columnEnds: number[] = [];
  const close = () => {
    for (const p of group) p.columns = columnEnds.length;
    group = [];
    columnEnds = [];
  };
  for (const item of sorted) {
    // A short item still takes up its drawn room, so its neighbours don't cover it.
    const to = Math.max(item.to, item.from + MIN_BLOCK_MINUTES);
    if (item.from >= groupEnd) close();
    let column = columnEnds.findIndex((end) => end <= item.from);
    if (column === -1) column = columnEnds.push(to) - 1;
    else columnEnds[column] = to;
    const p = { item, column, columns: 1 };
    group.push(p);
    placed.push(p);
    groupEnd = Math.max(groupEnd, to);
  }
  close();
  return placed;
}

/**
 * The hours the day's timeline covers: the opening hours, stretched to fit anything before or
 * after them, in whole hours. 8 AM to 8 PM when there is nothing to go by.
 */
export function timelineHours(open: { opensAt: number; closesAt: number } | null, items: { from: number; to: number }[]) {
  const froms = items.map((i) => i.from);
  const tos = items.map((i) => Math.max(i.to, i.from + MIN_BLOCK_MINUTES));
  const first = Math.min(open?.opensAt ?? 8 * 60, ...froms);
  const last = Math.max(open?.closesAt ?? 20 * 60, ...tos);
  return { startHour: Math.floor(first / 60), endHour: Math.min(24, Math.ceil(last / 60)) };
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
