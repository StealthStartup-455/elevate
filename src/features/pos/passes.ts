// The passes a sale gives the climber. Pure, so the rules can be checked
// without a database; actions.ts saves what these return.
import { endOfGymDay } from "@/features/climbers/status";
import type { Product } from "./types";

/**
 * `date` plus `months` calendar months, kept on the same day of the month
 * where it exists: Jan 31 plus one month is Feb 28 (or 29), not Mar 3.
 */
export function addMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const out = new Date(date);
  out.setUTCFullYear(y, m, Math.min(date.getUTCDate(), lastDay));
  return out;
}

type MembershipPass = { startsAt: Date; expiresAt: Date | null };

/**
 * When a new membership starts: now, or when the climber's current (or
 * already renewed) membership ends, so buying early never loses days. A
 * membership with no end date can't be added to; it starts now.
 */
export function membershipStartsAt(memberships: MembershipPass[], now: Date): Date {
  let start = now;
  for (const m of memberships) {
    if (m.expiresAt && m.expiresAt > start) start = m.expiresAt;
  }
  return start;
}

export type NewPass = {
  kind: "DAY" | "PUNCH" | "MEMBERSHIP";
  startsAt: Date;
  expiresAt: Date | null;
  visitsLeft: number | null;
  renews: boolean;
};

/**
 * The pass one product gives, or null for rentals and chalk.
 * - Day pass: today, until midnight in the gym's time zone.
 * - Punch card: its punches, no end date.
 * - Membership: its length in months from `membershipStart`.
 */
export function passFor(
  product: Product,
  opts: { now: Date; timeZone: string; membershipStart: Date },
): NewPass | null {
  const { now, timeZone, membershipStart } = opts;
  switch (product.kind) {
    case "DAY":
      return {
        kind: "DAY",
        startsAt: now,
        expiresAt: endOfGymDay(now, timeZone),
        visitsLeft: null,
        renews: false,
      };
    case "PUNCH":
      return {
        kind: "PUNCH",
        startsAt: now,
        expiresAt: null,
        visitsLeft: product.punches ?? 10,
        renews: false,
      };
    case "MEMBERSHIP":
      return {
        kind: "MEMBERSHIP",
        startsAt: membershipStart,
        expiresAt: addMonths(membershipStart, product.durationMonths ?? 1),
        visitsLeft: null,
        renews: product.recurring,
      };
    default:
      return null;
  }
}

/**
 * When a voided sale's pass stops: now, or for a membership that hasn't
 * started yet, the moment it would have started, so it never counts.
 */
export function voidedExpiry(startsAt: Date, now: Date): Date {
  return startsAt > now ? startsAt : now;
}
