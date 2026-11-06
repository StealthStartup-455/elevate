// When events, set changes and classes show, and what they say about timing.
// Pure, so it is unit tested; queries.ts applies it to the rows it reads.
import { addDays, daysBetween, formatClock, formatDay, gymClockAt, gymTime } from "./time";

/** The dashboard announces events starting within this many days. */
export const ANNOUNCE_DAYS = 30;
/** Set changes coming up within this many days are shown... */
export const SET_CHANGE_AHEAD_DAYS = 30;
/** ...and new routes are called new for this many days after they open. */
export const NEW_ROUTES_DAYS = 14;
/** Classes climbers can sign up for, this many days ahead. */
export const CLASS_DAYS = 14;

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When an event is over: at its end, or at midnight after its start when it
 * has no set end.
 */
export function eventEnd(startsAt: Date, endsAt: Date | null, timeZone: string): Date {
  if (endsAt) return endsAt;
  return gymTime(addDays(gymClockAt(startsAt, timeZone).day, 1), 0, timeZone);
}

/** "On now", "Today", "Tomorrow" or "In 12 days", on the gym's calendar. */
export function startsIn(now: Date, startsAt: Date, timeZone: string): string {
  if (startsAt <= now) return "On now";
  const days = daysBetween(gymClockAt(now, timeZone).day, gymClockAt(startsAt, timeZone).day);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export type SetChangeState = "coming" | "now" | "new";

/** Coming up, closed for setting right now, or new routes already open. */
export function setChangeState(now: Date, startsAt: Date, endsAt: Date): SetChangeState {
  if (now < startsAt) return "coming";
  if (now < endsAt) return "now";
  return "new";
}

/** "today at 2 PM", "tomorrow at 2 PM" or "Thu, Nov 5 at 2 PM". */
export function describeMoment(now: Date, at: Date, timeZone: string): string {
  const when = gymClockAt(at, timeZone);
  const days = daysBetween(gymClockAt(now, timeZone).day, when.day);
  const day = days === 0 ? "today" : days === 1 ? "tomorrow" : formatDay(when.day);
  return `${day} at ${formatClock(when.minutes)}`;
}

/** Places left in a class, never below zero. */
export function spotsLeft(capacity: number, booked: number): number {
  return Math.max(capacity - booked, 0);
}

/** "3 spots left", "1 spot left", "Full". */
export function describeSpots(left: number): string {
  if (left === 0) return "Full";
  return `${left} ${left === 1 ? "spot" : "spots"} left`;
}
