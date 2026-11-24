import { describe, expect, it } from "vitest";
import { computeMetrics, isLostScan, percentile, share, type AttemptRow, type MetricsInput } from "./compute";

const NOW = new Date("2026-11-24T20:00:00Z"); // noon in Victoria
const TZ = "America/Vancouver";
const SINCE = new Date("2026-11-23T08:00:00Z"); // midnight Nov 23 in Victoria
const TTL = 5 * 60 * 1000;

function attempt(over: Partial<AttemptRow>): AttemptRow {
  return {
    createdAt: new Date("2026-11-24T18:00:00Z"),
    source: "SEARCH",
    outcome: "CHECKED_IN",
    reason: null,
    wasBlocked: false,
    elapsedMs: 4000,
    ...over,
  };
}

function input(over: Partial<MetricsInput> = {}): MetricsInput {
  return {
    now: NOW,
    timeZone: TZ,
    since: SINCE,
    days: 2,
    scanTtlMs: TTL,
    attempts: [],
    scans: [],
    checkIns: [],
    firstVisits: [],
    newClimbers: [],
    sales: [],
    gymCreatedAt: new Date("2026-11-01T18:00:00Z"),
    firstCheckInAt: null,
    ...over,
  };
}

describe("percentile and share", () => {
  it("uses the nearest rank", () => {
    expect(percentile([5, 1, 3, 2, 4], 0.5)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBe(9);
    expect(percentile([7], 0.9)).toBe(7);
  });

  it("is empty with nothing to measure", () => {
    expect(percentile([], 0.5)).toBeNull();
    expect(share(1, 0)).toBeNull();
    expect(share(1, 4)).toBe(0.25);
  });
});

describe("computeMetrics: the front desk", () => {
  it("times only check ins that weren't blocked, and splits camera from search", () => {
    const m = computeMetrics(
      input({
        attempts: [
          attempt({ source: "CAMERA", elapsedMs: 2000 }),
          attempt({ source: "CAMERA", elapsedMs: 3000 }),
          attempt({ source: "SEARCH", elapsedMs: 9000 }),
          attempt({ wasBlocked: true, reason: "waiver_missing", elapsedMs: 60000 }),
          attempt({ elapsedMs: null, source: "CLIMBER_PAGE" }),
        ],
      }),
    ).frontDesk;
    expect(m.timeToCheckIn).toEqual({ median: 3000, p90: 9000, count: 3 });
    expect(m.byCamera.median).toBe(2000);
    expect(m.bySearch.median).toBe(9000);
    expect(m.sortOut).toEqual({ median: 60000, p90: 60000, count: 1 });
    expect(m.cameraShare).toBeCloseTo(2 / 4);
  });

  it("counts blocked attempts, their reasons and who was sent away", () => {
    const m = computeMetrics(
      input({
        attempts: [
          attempt({}),
          attempt({ outcome: "REFUSED", wasBlocked: true, reason: "already_checked_in" }),
          attempt({ outcome: "GAVE_UP", wasBlocked: true, reason: "membership_none,waiver_expired" }),
          attempt({ outcome: "GAVE_UP", wasBlocked: true, reason: "waiver_expired" }),
        ],
      }),
    );
    expect(m.frontDesk.blocked).toBe(3);
    expect(m.frontDesk.blockedShare).toBe(0.75);
    expect(m.frontDesk.sentAway).toBe(2);
    expect(m.frontDesk.topReasons[0]).toEqual({ reason: "waiver_expired", count: 2 });
    expect(m.waivers.blockedByWaiver).toBe(2);
  });

  it("measures how long arrivals waited and finds lost scans", () => {
    const scannedAt = new Date("2026-11-24T19:00:00Z");
    const scans = [
      { scannedAt, takenAt: new Date(scannedAt.getTime() + 8000) },
      { scannedAt, takenAt: new Date(scannedAt.getTime() + 20000) },
      { scannedAt, takenAt: null }, // an hour ago: lost
      { scannedAt: new Date(NOW.getTime() - 60000), takenAt: null }, // a minute ago: still waiting
    ];
    const m = computeMetrics(input({ scans })).frontDesk;
    expect(m.arrivalWait.median).toBe(8000);
    expect(m.lostScans).toBe(1);
    expect(isLostScan(scans[3], NOW, TTL)).toBe(false);
  });
});

describe("computeMetrics: the other value propositions", () => {
  it("counts first visits whose waiver was signed before that day", () => {
    const dayStart = new Date("2026-11-24T08:00:00Z");
    const m = computeMetrics(
      input({
        firstVisits: [
          { firstAt: NOW, dayStart, firstWaiverAt: new Date("2026-11-20T18:00:00Z") },
          { firstAt: NOW, dayStart, firstWaiverAt: new Date("2026-11-24T19:55:00Z") }, // at the desk
          { firstAt: NOW, dayStart, firstWaiverAt: null },
        ],
      }),
    );
    expect(m.waivers).toMatchObject({ firstVisits: 3, signedBefore: 1 });
    expect(m.waivers.share).toBeCloseTo(1 / 3);
  });

  it("counts self signups, online sales and voids, and days to the first check in", () => {
    const at = new Date("2026-11-24T18:00:00Z");
    const m = computeMetrics(
      input({
        newClimbers: [
          { createdAt: at, ownLogin: true },
          { createdAt: at, ownLogin: false },
        ],
        sales: [
          { createdAt: at, tender: "ONLINE", status: "PAID", voidedAt: null },
          { createdAt: at, tender: "CARD", status: "PAID", voidedAt: null },
          { createdAt: at, tender: "CASH", status: "VOIDED", voidedAt: at },
        ],
        firstCheckInAt: new Date("2026-11-03T20:00:00Z"),
      }),
    );
    expect(m.selfService).toMatchObject({ newClimbers: 2, ownLogin: 1, sales: 2, onlineSales: 1 });
    expect(m.selfService.onlineShare).toBe(0.5);
    expect(m.switching).toMatchObject({ daysToFirstCheckIn: 2, voidedSales: 1 });
  });
});

describe("computeMetrics: the daily table", () => {
  it("has one row per day in the gym's time zone, newest first", () => {
    const m = computeMetrics(
      input({
        checkIns: [
          { checkedInAt: new Date("2026-11-24T18:00:00Z") },
          // The evening of Nov 23 in Victoria, already Nov 24 in UTC. (Not
          // 07:00Z: tzdata 2026b keeps BC on UTC-7 all year, older Node on UTC-8.)
          { checkedInAt: new Date("2026-11-24T05:00:00Z") },
        ],
        attempts: [attempt({ elapsedMs: 5000 }), attempt({ outcome: "GAVE_UP", wasBlocked: true, reason: "waiver_missing" })],
      }),
    );
    expect(m.daily.map((d) => d.day)).toEqual(["2026-11-24", "2026-11-23"]);
    expect(m.daily[0]).toMatchObject({ checkIns: 1, medianMs: 5000, blocked: 1, sentAway: 1 });
    expect(m.daily[1]).toMatchObject({ checkIns: 1, medianMs: null });
  });
});
