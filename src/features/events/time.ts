// Times on the gym's clock. Pure: every function takes the gym's time zone, so
// the server's own zone (UTC on Vercel) never leaks into what climbers see.
// Calendar days are ISO dates ("2026-11-05"); clock times are minutes after
// midnight (360 is 6:00 AM, 1440 is midnight at the end of the day).
import { zoneOffsetMs } from "@/features/climbers/status";

export const MINUTES_PER_DAY = 24 * 60;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_MS = 24 * 60 * 60 * 1000;

function utcMidnight(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** The gym's calendar day, weekday (0 is Monday) and clock time at `date`. */
export function gymClockAt(date: Date, timeZone: string): { day: string; weekday: number; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "numeric",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  return { day, weekday: weekdayOf(day), minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

/** A calendar day `days` later (or earlier, if negative). */
export function addDays(day: string, days: number): string {
  return new Date(utcMidnight(day) + days * DAY_MS).toISOString().slice(0, 10);
}

/** 0 is Monday to 6 Sunday, like the busyness heat map. */
export function weekdayOf(day: string): number {
  return (new Date(utcMidnight(day)).getUTCDay() + 6) % 7;
}

/** The moment it is `minutes` after midnight on `day` on the gym's clock. */
export function gymTime(day: string, minutes: number, timeZone: string): Date {
  const asUtc = utcMidnight(day) + minutes * 60_000;
  const guess = asUtc - zoneOffsetMs(timeZone, new Date(asUtc));
  // Across a clock change the offset at the answer can differ from the first
  // guess's; one more pass settles it.
  return new Date(asUtc - zoneOffsetMs(timeZone, new Date(guess)));
}

/** 360 -> "6 AM", 1290 -> "9:30 PM", 720 -> "12 PM", 0 and 1440 -> "12 AM". */
export function formatClock(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h24 < 12 ? "AM" : "PM"}`;
}

/** "6 AM – 10 PM". */
export function formatClockRange(opensAt: number, closesAt: number): string {
  return `${formatClock(opensAt)} – ${formatClock(closesAt)}`;
}

/** "Thu, Nov 5". */
export function formatDay(day: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(utcMidnight(day)));
}

/** "Nov 5". */
export function formatShortDay(day: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(utcMidnight(day)),
  );
}

/** "Thu". */
export function weekdayName(weekday: number): string {
  return WEEKDAYS[weekday];
}

/**
 * When something happens, on the gym's clock: "Thu, Nov 5 · 6 PM – 7:30 PM",
 * or "Thu, Nov 5, 6 PM – Sat, Nov 7, 2 PM" when it runs over several days.
 */
export function formatSpan(startsAt: Date, endsAt: Date | null, timeZone: string): string {
  const start = gymClockAt(startsAt, timeZone);
  if (!endsAt) return `${formatDay(start.day)} · ${formatClock(start.minutes)}`;
  const end = gymClockAt(endsAt, timeZone);
  // Ending at midnight is still the same day: 1440 rather than 0 the next day.
  const endsSameDay = end.day === start.day || (end.minutes === 0 && end.day === addDays(start.day, 1));
  if (endsSameDay) {
    return `${formatDay(start.day)} · ${formatClockRange(start.minutes, end.day === start.day ? end.minutes : MINUTES_PER_DAY)}`;
  }
  return `${formatDay(start.day)}, ${formatClock(start.minutes)} – ${formatDay(end.day)}, ${formatClock(end.minutes)}`;
}

/** Whole calendar days from `from` to `to` (both ISO days). */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcMidnight(to) - utcMidnight(from)) / DAY_MS);
}
