// The value proposition metrics (#251), worked out from rows the app already
// saves plus CheckInAttempt. Pure: queries.ts fetches the rows, this turns
// them into numbers, and the tests check the arithmetic without a database.
import { isoDayIn } from "@/features/climbers/status";

export type Stat = { median: number | null; p90: number | null; count: number };

export type AttemptRow = {
  createdAt: Date;
  source: "CAMERA" | "SEARCH" | "CLIMBER_PAGE";
  outcome: "CHECKED_IN" | "REFUSED" | "GAVE_UP";
  reason: string | null;
  wasBlocked: boolean;
  elapsedMs: number | null;
};

export type MetricsInput = {
  now: Date;
  timeZone: string;
  /** Start of the first day in the window, in the gym's time zone. */
  since: Date;
  days: number;
  /** A scan nobody dealt with for this long is lost. */
  scanTtlMs: number;
  attempts: AttemptRow[];
  scans: { scannedAt: Date; takenAt: Date | null }[];
  checkIns: { checkedInAt: Date }[];
  /** Climbers whose first ever visit is in the window, and when they first signed a waiver. */
  firstVisits: { firstAt: Date; firstWaiverAt: Date | null; dayStart: Date }[];
  newClimbers: { createdAt: Date; ownLogin: boolean }[];
  sales: { createdAt: Date; tender: string; status: string; voidedAt: Date | null }[];
  gymCreatedAt: Date;
  firstCheckInAt: Date | null;
};

export type ReasonCount = { reason: string; count: number };

export type DayRow = {
  day: string; // YYYY-MM-DD in the gym's time zone
  checkIns: number;
  medianMs: number | null;
  blocked: number;
  sentAway: number;
  lostScans: number;
  voidedSales: number;
};

export type ValuePropMetrics = {
  frontDesk: {
    checkIns: number;
    timeToCheckIn: Stat;
    byCamera: Stat;
    bySearch: Stat;
    arrivalWait: Stat;
    attempts: number;
    blocked: number;
    blockedShare: number | null;
    topReasons: ReasonCount[];
    sortOut: Stat;
    sentAway: number;
    lostScans: number;
    cameraShare: number | null;
  };
  waivers: { firstVisits: number; signedBefore: number; share: number | null; blockedByWaiver: number };
  selfService: {
    newClimbers: number;
    ownLogin: number;
    signupShare: number | null;
    sales: number;
    onlineSales: number;
    onlineShare: number | null;
  };
  switching: { gymCreatedAt: Date; firstCheckInAt: Date | null; daysToFirstCheckIn: number | null; voidedSales: number };
  daily: DayRow[];
};

/** The value at `p` (0 to 1) of the sorted values, by nearest rank. Null when empty. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(p * sorted.length));
  return sorted[rank - 1];
}

export function stat(values: number[]): Stat {
  return { median: percentile(values, 0.5), p90: percentile(values, 0.9), count: values.length };
}

/** `part` of `whole` as 0 to 1, or null when there's nothing to divide. */
export function share(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

const timed = (rows: AttemptRow[]) =>
  rows.map((a) => a.elapsedMs).filter((ms): ms is number => ms !== null);

export function isLostScan(scan: { scannedAt: Date; takenAt: Date | null }, now: Date, ttlMs: number) {
  return scan.takenAt === null && now.getTime() - scan.scannedAt.getTime() > ttlMs;
}

function countReasons(rows: AttemptRow[]): ReasonCount[] {
  const counts = new Map<string, number>();
  for (const a of rows) {
    for (const reason of (a.reason ?? "unknown").split(",")) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeMetrics(input: MetricsInput): ValuePropMetrics {
  const { attempts, now, scanTtlMs } = input;
  const checkedIn = attempts.filter((a) => a.outcome === "CHECKED_IN");
  const clean = checkedIn.filter((a) => !a.wasBlocked);
  const blockedRows = attempts.filter((a) => a.wasBlocked);
  const camera = checkedIn.filter((a) => a.source === "CAMERA");
  const search = checkedIn.filter((a) => a.source === "SEARCH");
  const sentAway = attempts.filter((a) => a.outcome === "GAVE_UP" && a.wasBlocked);
  const waits = input.scans
    .filter((s) => s.takenAt)
    .map((s) => s.takenAt!.getTime() - s.scannedAt.getTime());
  const lost = input.scans.filter((s) => isLostScan(s, now, scanTtlMs));
  const signedBefore = input.firstVisits.filter(
    (v) => v.firstWaiverAt !== null && v.firstWaiverAt < v.dayStart,
  ).length;
  const paidSales = input.sales.filter((s) => s.status !== "VOIDED");
  const voided = input.sales.filter((s) => s.status === "VOIDED");
  const ownLogin = input.newClimbers.filter((c) => c.ownLogin).length;
  const online = paidSales.filter((s) => s.tender === "ONLINE").length;

  return {
    frontDesk: {
      checkIns: input.checkIns.length,
      timeToCheckIn: stat(timed(clean)),
      byCamera: stat(timed(camera.filter((a) => !a.wasBlocked))),
      bySearch: stat(timed(search.filter((a) => !a.wasBlocked))),
      arrivalWait: stat(waits),
      attempts: attempts.length,
      blocked: blockedRows.length,
      blockedShare: share(blockedRows.length, attempts.length),
      topReasons: countReasons(blockedRows).slice(0, 5),
      sortOut: stat(timed(checkedIn.filter((a) => a.wasBlocked))),
      sentAway: sentAway.length,
      lostScans: lost.length,
      cameraShare: share(camera.length, camera.length + search.length),
    },
    waivers: {
      firstVisits: input.firstVisits.length,
      signedBefore,
      share: share(signedBefore, input.firstVisits.length),
      blockedByWaiver: blockedRows.filter((a) => a.reason?.includes("waiver_")).length,
    },
    selfService: {
      newClimbers: input.newClimbers.length,
      ownLogin,
      signupShare: share(ownLogin, input.newClimbers.length),
      sales: paidSales.length,
      onlineSales: online,
      onlineShare: share(online, paidSales.length),
    },
    switching: {
      gymCreatedAt: input.gymCreatedAt,
      firstCheckInAt: input.firstCheckInAt,
      daysToFirstCheckIn: input.firstCheckInAt
        ? Math.max(0, Math.floor((input.firstCheckInAt.getTime() - input.gymCreatedAt.getTime()) / DAY_MS))
        : null,
      voidedSales: voided.length,
    },
    daily: dailyRows(input, lost),
  };
}

// One row per day in the window, newest first, with the front desk numbers.
function dailyRows(input: MetricsInput, lost: { scannedAt: Date }[]): DayRow[] {
  const { timeZone } = input;
  const day = (d: Date) => isoDayIn(d, timeZone);
  const rows = new Map<string, DayRow & { times: number[] }>();
  for (let i = 0; i < input.days; i++) {
    // Noon on each day keeps a clock change from skipping or repeating one.
    const key = day(new Date(input.since.getTime() + i * DAY_MS + 12 * 60 * 60 * 1000));
    rows.set(key, { day: key, checkIns: 0, medianMs: null, blocked: 0, sentAway: 0, lostScans: 0, voidedSales: 0, times: [] });
  }
  const at = (d: Date) => rows.get(day(d));
  for (const c of input.checkIns) {
    const row = at(c.checkedInAt);
    if (row) row.checkIns++;
  }
  for (const a of input.attempts) {
    const row = at(a.createdAt);
    if (!row) continue;
    if (a.outcome === "CHECKED_IN" && !a.wasBlocked && a.elapsedMs !== null) row.times.push(a.elapsedMs);
    if (a.wasBlocked) row.blocked++;
    if (a.outcome === "GAVE_UP" && a.wasBlocked) row.sentAway++;
  }
  for (const s of lost) {
    const row = at(s.scannedAt);
    if (row) row.lostScans++;
  }
  for (const s of input.sales) {
    if (s.status !== "VOIDED") continue;
    const row = at(s.voidedAt ?? s.createdAt);
    if (row) row.voidedSales++;
  }
  return [...rows.values()]
    .map(({ times, ...row }) => ({ ...row, medianMs: percentile(times, 0.5) }))
    .reverse();
}
