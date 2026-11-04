// Waiver and membership status are worked out from the Waiver and Pass rows;
// nothing stores them. Pure, so it can be checked without a database.
import type { MembershipStatus, WaiverStatus } from "./types";

// A signed waiver stays valid for a year. The schema has no expiry column.
export const WAIVER_VALID_YEARS = 1;

export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// The calendar date of `date` in `timeZone`, as YYYY-MM-DD.
export function isoDayIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

// The same calendar date `years` later ("2026-10-29" to "2027-10-29").
function addYearsToDay(isoDate: string, years: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return isoDay(new Date(Date.UTC(y + years, m - 1, d)));
}

export type WaiverSummary = { status: WaiverStatus; expiresOn?: string };

/**
 * `latest` is the climber's most recent signed waiver. If the gym requires a
 * specific `gymVersion`, an older wording counts as expired and must be re-signed.
 *
 * Dates are the gym's (#125): a waiver signed on Oct 29 in the gym's time zone
 * expires on Oct 29 a year later, and is valid until midnight that day there.
 * In UTC, a waiver signed in the evening in Victoria counted as the next day.
 */
export function summarizeWaiver(
  latest: { signedAt: Date; version: string } | undefined,
  gymVersion: string | null,
  now: Date,
  timeZone = "UTC",
): WaiverSummary {
  if (!latest) return { status: "missing" };
  const expiresOn = addYearsToDay(isoDayIn(latest.signedAt, timeZone), WAIVER_VALID_YEARS);
  // Noon UTC on that date is the same date in any gym's time zone in the Americas.
  const validUntil = endOfGymDay(new Date(`${expiresOn}T12:00:00Z`), timeZone);
  const current = !gymVersion || latest.version === gymVersion;
  return {
    status: current && now < validUntil ? "valid" : "expired",
    expiresOn,
  };
}

export type MembershipSummary = {
  status: MembershipStatus;
  /** ISO date the membership in effect ends (or ended). */
  renewsOn?: string;
  /** A monthly recurring plan, which renews; a one-off one just ends (#132). */
  recurring?: boolean;
  /** The product it was sold as, when it came from a sale. */
  plan?: string;
};

type MembershipPass = {
  startsAt: Date;
  expiresAt: Date | null;
  pausedAt: Date | null;
  renews?: boolean;
  plan?: string | null;
};

/**
 * `passes` are all of the climber's membership passes. A pass that has not
 * started yet (a renewal bought early) is ignored, so the one in effect today
 * decides the status. Without that, buying next month's membership early would
 * make the climber look like they have none.
 */
export function summarizeMembership(
  passes: MembershipPass[],
  now: Date,
): MembershipSummary {
  const latest = passes
    .filter((p) => p.startsAt <= now)
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())[0];
  if (!latest) return { status: "none" };
  const renewsOn = latest.expiresAt ? isoDay(latest.expiresAt) : undefined;
  const about = { renewsOn, recurring: latest.renews, plan: latest.plan ?? undefined };
  if (latest.expiresAt && latest.expiresAt <= now) return { status: "expired", ...about };
  if (latest.pausedAt) return { status: "paused", ...about };
  return { status: "active", ...about };
}

// STOPGAP(#62): a no-charge day pass so desk staff can let a new climber in
// before memberships and purchases exist. Replace with #44 to #46.

type DayPass = { startsAt: Date; expiresAt: Date | null };

/** True when one of the climber's DAY passes covers `now`. */
export function hasDayPass(passes: DayPass[], now: Date): boolean {
  return passes.some((p) => p.startsAt <= now && (!p.expiresAt || p.expiresAt > now));
}

type PunchPass = { startsAt: Date; expiresAt: Date | null; visitsLeft: number | null };

/** Visits left on the climber's punch cards that are in effect at `now`. */
export function punchesLeft(passes: PunchPass[], now: Date): number {
  return passes
    .filter((p) => p.startsAt <= now && (!p.expiresAt || p.expiresAt > now))
    .reduce((sum, p) => sum + Math.max(p.visitsLeft ?? 0, 0), 0);
}

// How far `timeZone` is ahead of UTC at `date`, in milliseconds.
function zoneOffsetMs(timeZone: string, date: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(date)
      .map((p) => [p.type, Number(p.value)]),
  );
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Midnight at the end of `now`'s calendar day in the gym's time zone. */
export function endOfGymDay(now: Date, timeZone: string): Date {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone })
    .format(now)
    .split("-")
    .map(Number);
  const midnightAsUtc = Date.UTC(y, m - 1, d + 1);
  return new Date(midnightAsUtc - zoneOffsetMs(timeZone, new Date(midnightAsUtc)));
}
