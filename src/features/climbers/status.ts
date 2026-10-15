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

/** `latest` is the climber's most recent membership pass, if they ever had one. */
export function summarizeMembership(
  latest: { startsAt: Date; expiresAt: Date | null; pausedAt: Date | null } | undefined,
  now: Date,
): MembershipSummary {
  if (!latest || latest.startsAt > now) return { status: "none" };
  const renewsOn = latest.expiresAt ? isoDay(latest.expiresAt) : undefined;
  if (latest.expiresAt && latest.expiresAt <= now) return { status: "expired", renewsOn };
  if (latest.pausedAt) return { status: "paused", renewsOn };
  return { status: "active", renewsOn };
}
