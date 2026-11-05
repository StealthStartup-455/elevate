// Opening hours for the week ahead, and whether the gym is open now. Pure, so
// it is unit tested; queries.ts reads the rows and passes them in.
import {
  addDays,
  formatClock,
  formatClockRange,
  formatShortDay,
  gymClockAt,
  MINUTES_PER_DAY,
  weekdayName,
  weekdayOf,
} from "./time";

/** One weekday of the regular week (an OpeningHours row). */
export type WeeklyHours = { weekday: number; closed: boolean; opensAt: number; closesAt: number };

/** A date that differs from the regular week (a SpecialHours row). */
export type SpecialDay = {
  day: string;
  closed: boolean;
  opensAt: number | null;
  closesAt: number | null;
  note: string | null;
};

export type Hours = { opensAt: number; closesAt: number };

export type DayHours = {
  day: string;
  weekday: number;
  /** "Today", "Tomorrow", then "Wed". */
  label: string;
  /** "Nov 4". */
  date: string;
  /** Null when the gym is closed all day. */
  hours: Hours | null;
  /** True when a special day replaces the regular hours. */
  special: boolean;
  note: string | null;
};

export type OpenStatus =
  | { open: true; closesAt: number }
  | { open: false; next: { day: DayHours; opensAt: number; offset: number } | null };

/** Days the climber's card lists, starting today. */
export const DAYS_SHOWN = 7;

function hoursOf(closed: boolean, opensAt: number | null, closesAt: number | null): Hours | null {
  if (closed || opensAt === null || closesAt === null || opensAt >= closesAt) return null;
  return { opensAt, closesAt };
}

/**
 * The next seven days on the gym's calendar (or `count` days, for the climber's month
 * calendar), today first. A special day wins over the regular week; a weekday with no row is
 * closed.
 */
export function weekAhead(
  now: Date,
  timeZone: string,
  weekly: WeeklyHours[],
  special: SpecialDay[],
  count: number = DAYS_SHOWN,
): DayHours[] {
  const today = gymClockAt(now, timeZone).day;
  const byWeekday = new Map(weekly.map((w) => [w.weekday, w]));
  const byDay = new Map(special.map((s) => [s.day, s]));
  return Array.from({ length: count }, (_, i) => {
    const day = addDays(today, i);
    const weekday = weekdayOf(day);
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : weekdayName(weekday);
    const override = byDay.get(day);
    if (override) {
      return {
        day,
        weekday,
        label,
        date: formatShortDay(day),
        hours: hoursOf(override.closed, override.opensAt, override.closesAt),
        special: true,
        note: override.note,
      };
    }
    const regular = byWeekday.get(weekday);
    return {
      day,
      weekday,
      label,
      date: formatShortDay(day),
      hours: regular ? hoursOf(regular.closed, regular.opensAt, regular.closesAt) : null,
      special: false,
      note: null,
    };
  });
}

/** Open right now, or when it next opens within the days given. */
export function openStatus(now: Date, timeZone: string, days: DayHours[]): OpenStatus {
  const minutes = gymClockAt(now, timeZone).minutes;
  const today = days[0]?.hours;
  if (today && minutes >= today.opensAt && minutes < today.closesAt) {
    return { open: true, closesAt: today.closesAt };
  }
  if (today && minutes < today.opensAt) {
    return { open: false, next: { day: days[0], opensAt: today.opensAt, offset: 0 } };
  }
  const offset = days.findIndex((d, i) => i > 0 && d.hours);
  return {
    open: false,
    next: offset > 0 ? { day: days[offset], opensAt: days[offset].hours!.opensAt, offset } : null,
  };
}

/** "Closes at 10 PM", "Opens at 6 AM", "Opens tomorrow at 9 AM", "Opens Wed at 9 AM". */
export function describeStatus(status: OpenStatus): string {
  if (status.open) {
    return status.closesAt >= MINUTES_PER_DAY ? "Closes at midnight" : `Closes at ${formatClock(status.closesAt)}`;
  }
  if (!status.next) return "Closed for the next week";
  const at = formatClock(status.next.opensAt);
  if (status.next.offset === 0) return `Opens at ${at}`;
  if (status.next.offset === 1) return `Opens tomorrow at ${at}`;
  return `Opens ${status.next.day.label} at ${at}`;
}

/** "6 AM – 10 PM", or "Closed". */
export function describeHours(hours: Hours | null): string {
  return hours ? formatClockRange(hours.opensAt, hours.closesAt) : "Closed";
}

/**
 * The hours of the day the busyness strips cover: from the earliest opening to
 * the latest closing in the days shown, as [from, to) whole hours.
 */
export function hourRange(days: DayHours[]): { from: number; to: number } | null {
  const open = days.flatMap((d) => (d.hours ? [d.hours] : []));
  if (open.length === 0) return null;
  return {
    from: Math.floor(Math.min(...open.map((h) => h.opensAt)) / 60),
    to: Math.ceil(Math.max(...open.map((h) => h.closesAt)) / 60),
  };
}

/** Whether any part of the hour starting at `hour` is inside opening hours. */
export function isOpenDuring(hours: Hours | null, hour: number): boolean {
  return !!hours && hour * 60 < hours.closesAt && (hour + 1) * 60 > hours.opensAt;
}
