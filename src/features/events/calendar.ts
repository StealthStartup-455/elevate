// The climber's month calendar (#101): which days go in a month's grid, and moving between
// months. Pure, on ISO days ("2026-11-05") like time.ts, so the server's time zone never
// matters. Weeks start on Monday, like the rest of the gym calendar.
import { addDays, weekdayOf } from "./time";

/** "2026-11" for "2026-11-05". */
export function monthOf(day: string): string {
  return day.slice(0, 7);
}

/** The month `count` months after `month` ("2026-11", 2 -> "2027-01"). */
export function addMonths(month: string, count: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + count;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** "November 2026". */
export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

/**
 * The month as weeks of seven, Monday first. Days from the months either side are null, so
 * every row is a full week and the grid lines up.
 */
export function monthGrid(month: string): (string | null)[][] {
  const first = `${month}-01`;
  const days: (string | null)[] = Array.from({ length: weekdayOf(first) }, () => null);
  for (let day = first; monthOf(day) === month; day = addDays(day, 1)) days.push(day);
  while (days.length % 7) days.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

/**
 * The months the calendar can show: from today's month to the month of the last thing on it,
 * so there's never an empty month to page to.
 */
export function calendarMonths(today: string, days: string[]): string[] {
  const last = days.reduce((max, day) => (day > max ? day : max), today);
  const months = [monthOf(today)];
  while (months.at(-1)! < monthOf(last)) months.push(addMonths(months.at(-1)!, 1));
  return months;
}
