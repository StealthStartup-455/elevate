// Waiver and membership status are worked out from the Waiver and Pass rows;
// nothing stores them. Pure, so it can be checked without a database.
import type { MembershipStatus, WaiverStatus } from "./types";

// A signed waiver stays valid for a year. The schema has no expiry column.
export const WAIVER_VALID_YEARS = 1;

function addYears(date: Date, years: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate()),
  );
}

export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type WaiverSummary = { status: WaiverStatus; expiresOn?: string };

/**
 * `latest` is the climber's most recent signed waiver. If the gym requires a
 * specific `gymVersion`, an older wording counts as expired and must be re-signed.
 */
export function summarizeWaiver(
  latest: { signedAt: Date; version: string } | undefined,
  gymVersion: string | null,
  now: Date,
): WaiverSummary {
  if (!latest) return { status: "missing" };
  const expires = addYears(latest.signedAt, WAIVER_VALID_YEARS);
  const current = !gymVersion || latest.version === gymVersion;
  return {
    status: current && expires > now ? "valid" : "expired",
    expiresOn: isoDay(expires),
  };
}

export type MembershipSummary = { status: MembershipStatus; renewsOn?: string };

type MembershipPass = { startsAt: Date; expiresAt: Date | null; pausedAt: Date | null };

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
  if (latest.expiresAt && latest.expiresAt <= now) return { status: "expired", renewsOn };
  if (latest.pausedAt) return { status: "paused", renewsOn };
  return { status: "active", renewsOn };
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
