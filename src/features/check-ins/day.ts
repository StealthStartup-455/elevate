// The desk's day of check-ins (#168): which hours make up a gym day, how the
// URL picks one, and what each row of the Check-in table says. Pure, so it can
// be checked without a database; queries.ts reads the rows.
import { formatDate } from "@/features/climbers/format";
import {
  endOfGymDay,
  hasDayPass,
  isoDay,
  summarizeMembership,
  type WaiverSummary,
} from "@/features/climbers/status";
import type { ScanStatus } from "./scan-messages";

/** The gym's calendar day at `now`, YYYY-MM-DD. */
export function gymDay(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

// No gym day is 26 hours long, so this far before the end of a day is always
// inside the day before it (23 to 25 hours long, with daylight saving).
const MORE_THAN_A_DAY_MS = 26 * 60 * 60 * 1000;

/**
 * Midnight at the start of `date`'s calendar day in the gym's time zone. The
 * partner of endOfGymDay, built on it so daylight saving is handled in one
 * place: the start of today is the end of yesterday.
 */
export function startOfGymDay(date: Date, timeZone: string): Date {
  const end = endOfGymDay(date, timeZone);
  return endOfGymDay(new Date(end.getTime() - MORE_THAN_A_DAY_MS), timeZone);
}

/** From midnight to midnight of `day` (YYYY-MM-DD) in the gym's time zone. */
export function gymDayBounds(day: string, timeZone: string): { start: Date; end: Date } {
  // Midnight UTC is on `day` or the evening before it in every time zone.
  const midnightUtc = new Date(`${day}T00:00:00Z`);
  const start =
    gymDay(midnightUtc, timeZone) === day
      ? startOfGymDay(midnightUtc, timeZone)
      : endOfGymDay(midnightUtc, timeZone);
  return { start, end: endOfGymDay(start, timeZone) };
}

type SearchParam = string | string[] | undefined;

/** `value` if it is a real day up to `today`, otherwise `today`. */
export function parseDay(value: SearchParam, today: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return today;
  const date = new Date(`${value}T00:00:00Z`);
  // 2026-02-30 parses as Mar 2, so it has to come back the same.
  if (Number.isNaN(date.getTime()) || isoDay(date) !== value) return today;
  // Nobody has checked in tomorrow yet.
  return value <= today ? value : today;
}

const MAX_PAGE = 10_000;

/** A page number from 1, otherwise 1. */
export function parsePage(value: SearchParam): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return page >= 1 && page <= MAX_PAGE ? page : 1;
}

/** `day` moved by `days` calendar days. */
export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDay(date);
}

function hourFormat(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" });
}

/** The hour on the gym's clock at `now`, 0 to 23. */
export function gymHour(now: Date, timeZone: string): number {
  return Number(hourFormat(timeZone).format(now)) % 24;
}

/** Check-ins per hour of the gym's clock, 0 to 23, for the header's bar chart. */
export function countByHour(times: Date[], timeZone: string): number[] {
  const hourOf = hourFormat(timeZone);
  const hourly = Array<number>(24).fill(0);
  for (const t of times) hourly[Number(hourOf.format(t)) % 24] += 1;
  return hourly;
}

/** The Check-in page for `day` and `page`; today and page 1 stay out of the URL. */
export function deskHref(day: string, today: string, page = 1): string {
  const params = new URLSearchParams();
  if (day !== today) params.set("date", day);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/desk?${query}` : "/desk";
}

export type Badge = "MEMBER" | "DAY_PASS" | "PUNCH_CARD" | "NO_PASS" | "EMPLOYEE";

/**
 * What lets the climber in, in the order checkInClimber uses them: an active
 * membership, then a day pass, then a punch card with visits left. NO_PASS
 * means check-in refuses them. The waiver is a separate rule.
 */
export function badgeFor(s: Pick<ScanStatus, "membershipStatus" | "hasDayPass" | "punchesLeft">): Badge {
  if (s.membershipStatus === "active") return "MEMBER";
  if (s.hasDayPass) return "DAY_PASS";
  if ((s.punchesLeft ?? 0) > 0) return "PUNCH_CARD";
  return "NO_PASS";
}

type Pass = {
  kind: string; // PassKind: MEMBERSHIP, DAY or PUNCH
  startsAt: Date;
  expiresAt: Date | null;
  pausedAt: Date | null;
  visitsLeft: number | null;
};

/**
 * The pass that let a climber in at `at`. CheckIn rows don't record it, and
 * the passes change afterwards (a day pass ends at midnight, the visit may
 * have used the last punch), so it is worked out from the passes at that time.
 */
export function badgeAt(passes: Pass[], at: Date): Badge {
  const inEffect = (p: Pass) => p.startsAt <= at && (!p.expiresAt || p.expiresAt > at);
  const memberships = passes
    .filter((p) => p.kind === "MEMBERSHIP")
    // pausedAt only says when the pause started; a later one didn't apply yet.
    .map((p) => ({ ...p, pausedAt: p.pausedAt && p.pausedAt <= at ? p.pausedAt : null }));
  return badgeFor({
    membershipStatus: summarizeMembership(memberships, at).status,
    hasDayPass: hasDayPass(passes.filter((p) => p.kind === "DAY"), at),
    // A card in effect then is what let them in, whatever it has left now.
    punchesLeft: passes.filter((p) => p.kind === "PUNCH" && inEffect(p)).length,
  });
}

export type Tone = "normal" | "warning" | "error";
export type Label = { text: string; tone: Tone };

// A waiver running out this soon is called out on the desk.
export const WAIVER_WARNING_DAYS = 7;

function daysUntil(day: string, today: string): number {
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

function expiresSoon(waiver: WaiverSummary, today: string): number | null {
  if (waiver.status !== "valid" || !waiver.expiresOn) return null;
  const days = daysUntil(waiver.expiresOn, today);
  return days <= WAIVER_WARNING_DAYS ? days : null;
}

/** The Waiver column's pill: Valid, Expires Nov 8, Expired or Not signed. */
export function waiverLabel(waiver: WaiverSummary, today: string): Label {
  if (waiver.status === "missing") return { text: "Not signed", tone: "error" };
  if (waiver.status === "expired") return { text: "Expired", tone: "error" };
  if (expiresSoon(waiver, today) !== null) {
    return { text: `Expires ${formatDate(waiver.expiresOn!)}`, tone: "warning" };
  }
  return { text: "Valid", tone: "normal" };
}

function whenWaiverExpires(expiresOn: string, days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  // A week out falls on today's weekday, which would read as today.
  if (days >= 7) return formatDate(expiresOn);
  return new Intl.DateTimeFormat("en-CA", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${expiresOn}T00:00:00Z`),
  );
}

export type RowFacts = {
  /** The pass that let them in (badgeAt). */
  badge: Badge;
  /** Visits left on their punch cards now. */
  punchesLeft: number;
  /** Their waiver now. */
  waiver: WaiverSummary;
  /** The gym's day today, YYYY-MM-DD. */
  today: string;
  /** This is their first check-in at the gym. */
  firstVisit: boolean;
  /** This is their most recent check-in, so today's punch count applies to it. */
  latestVisit: boolean;
};

/**
 * The Message column, the one thing worth saying about a visit. Most urgent
 * first: a waiver problem, the last punch used, a first visit, then what let
 * them in.
 */
export function rowMessage(r: RowFacts): Label {
  if (r.waiver.status === "missing") return { text: "No waiver", tone: "error" };
  if (r.waiver.status === "expired") return { text: "Waiver expired", tone: "error" };
  const days = expiresSoon(r.waiver, r.today);
  if (days !== null) {
    return { text: `Waiver expires ${whenWaiverExpires(r.waiver.expiresOn!, days)}`, tone: "warning" };
  }
  if (r.badge === "NO_PASS") return { text: "No pass", tone: "error" };
  if (r.badge === "EMPLOYEE") return { text: "Employee access", tone: "normal" };
  const countsPunches = r.badge === "PUNCH_CARD" && r.latestVisit;
  if (countsPunches && r.punchesLeft === 0) return { text: "Last visit on the card", tone: "warning" };
  if (r.firstVisit) return { text: "First visit", tone: "normal" };
  if (r.badge === "MEMBER") return { text: "Gym access", tone: "normal" };
  if (r.badge === "DAY_PASS") return { text: "Day pass", tone: "normal" };
  if (!countsPunches) return { text: "Punch card", tone: "normal" };
  return { text: `${r.punchesLeft} visit${r.punchesLeft === 1 ? "" : "s"} left`, tone: "normal" };
}
