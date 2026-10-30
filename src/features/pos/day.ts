// The gym's calendar day, for "today's sales" and "checked in today". Pure.
import { endOfGymDay } from "@/features/climbers/status";

/** Midnight at the start of `now`'s calendar day in the gym's time zone. */
export function startOfGymDay(now: Date, timeZone: string): Date {
  // The end of the previous day. A day is 23 to 25 hours long when the
  // clocks change, so 36 hours before tonight's midnight is always yesterday.
  const midnight = endOfGymDay(now, timeZone);
  return endOfGymDay(new Date(midnight.getTime() - 36 * 60 * 60 * 1000), timeZone);
}
