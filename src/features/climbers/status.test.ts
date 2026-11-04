import { describe, expect, it } from "vitest";
import { endOfGymDay, hasDayPass, punchesLeft, summarizeMembership, summarizeWaiver } from "./status";

const NOW = new Date("2026-10-20T18:00:00Z");
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("summarizeWaiver", () => {
  it("is missing when the climber never signed", () => {
    expect(summarizeWaiver(undefined, null, NOW)).toEqual({ status: "missing" });
  });

  it("is valid for a year after signing", () => {
    const result = summarizeWaiver({ signedAt: day("2026-03-01"), version: "v1" }, null, NOW);
    expect(result).toEqual({ status: "valid", expiresOn: "2027-03-01" });
  });

  it("is expired once the year has passed", () => {
    const result = summarizeWaiver({ signedAt: day("2025-10-01"), version: "v1" }, null, NOW);
    expect(result).toEqual({ status: "expired", expiresOn: "2026-10-01" });
  });

  it("counts an older wording as expired when the gym requires a version", () => {
    const result = summarizeWaiver({ signedAt: day("2026-09-01"), version: "v1" }, "v2", NOW);
    expect(result.status).toBe("expired");
  });

  it("accepts the required version", () => {
    const result = summarizeWaiver({ signedAt: day("2026-09-01"), version: "v2" }, "v2", NOW);
    expect(result.status).toBe("valid");
  });
  // #125: 5 p.m. on Oct 29 in Victoria is already Oct 30 in UTC.
  const eveningSigned = { signedAt: new Date("2026-10-30T00:00:00Z"), version: "v1" };

  it("dates a waiver signed in the evening by the gym's day, not UTC's", () => {
    const result = summarizeWaiver(eveningSigned, null, NOW, "America/Vancouver");
    expect(result).toEqual({ status: "valid", expiresOn: "2027-10-29" });
  });

  it("stays valid until midnight in the gym's time zone on the expiry day", () => {
    const lastEvening = new Date("2027-10-30T06:59:00Z"); // 11:59 p.m. Oct 29, Victoria
    const nextMorning = new Date("2027-10-30T07:01:00Z"); // 12:01 a.m. Oct 30, Victoria
    expect(summarizeWaiver(eveningSigned, null, lastEvening, "America/Vancouver").status).toBe("valid");
    expect(summarizeWaiver(eveningSigned, null, nextMorning, "America/Vancouver").status).toBe("expired");
  });
});

describe("summarizeMembership plan details (issue 132)", () => {
  it("says whether the plan renews, and its name when it was sold", () => {
    const sold = { startsAt: day("2026-10-01"), expiresAt: day("2026-11-30"), pausedAt: null, renews: false, plan: "1 month membership" };
    expect(summarizeMembership([sold], NOW)).toMatchObject({ status: "active", recurring: false, plan: "1 month membership" });
    expect(summarizeMembership([{ ...sold, renews: true, plan: null }], NOW)).toMatchObject({ recurring: true, plan: undefined });
  });
});

describe("summarizeMembership", () => {
  const pass = (startsAt: string, expiresAt: string | null, pausedAt: string | null = null) => ({
    startsAt: day(startsAt),
    expiresAt: expiresAt ? day(expiresAt) : null,
    pausedAt: pausedAt ? day(pausedAt) : null,
  });

  it("is none without passes", () => {
    expect(summarizeMembership([], NOW)).toEqual({ status: "none" });
  });

  it("is active while the current pass runs", () => {
    expect(summarizeMembership([pass("2026-10-01", "2026-11-01")], NOW)).toEqual({
      status: "active",
      renewsOn: "2026-11-01",
    });
  });

  it("is active with no end date", () => {
    expect(summarizeMembership([pass("2026-01-01", null)], NOW)).toEqual({ status: "active" });
  });

  it("is expired after the end date", () => {
    expect(summarizeMembership([pass("2026-09-01", "2026-10-01")], NOW).status).toBe("expired");
  });

  it("is paused while on hold", () => {
    const result = summarizeMembership([pass("2026-10-01", "2026-11-01", "2026-10-10")], NOW);
    expect(result.status).toBe("paused");
  });

  // Regression test for the Oct 14 fix (fix/42-membership-status-future-pass):
  // a renewal bought early must not hide the membership in effect today.
  it("ignores a pass that has not started yet", () => {
    const result = summarizeMembership(
      [pass("2026-10-01", "2026-11-01"), pass("2026-11-01", "2026-12-01")],
      NOW,
    );
    expect(result).toEqual({ status: "active", renewsOn: "2026-11-01" });
  });

  it("is none when the only pass starts later", () => {
    expect(summarizeMembership([pass("2026-11-01", "2026-12-01")], NOW).status).toBe("none");
  });
});

describe("hasDayPass", () => {
  it("is false with no day passes", () => {
    expect(hasDayPass([], NOW)).toBe(false);
  });

  it("is true while today's pass runs", () => {
    const pass = { startsAt: new Date("2026-10-20T16:00:00Z"), expiresAt: new Date("2026-10-21T07:00:00Z") };
    expect(hasDayPass([pass], NOW)).toBe(true);
  });

  it("is false once the pass has expired", () => {
    const pass = { startsAt: new Date("2026-10-19T16:00:00Z"), expiresAt: new Date("2026-10-20T07:00:00Z") };
    expect(hasDayPass([pass], NOW)).toBe(false);
  });
});

describe("endOfGymDay", () => {
  it("is local midnight in summer time", () => {
    // 11am in Victoria (UTC-7); the day ends at 07:00 UTC the next day.
    expect(endOfGymDay(NOW, "America/Vancouver")).toEqual(new Date("2026-10-21T07:00:00Z"));
  });

  it("is local midnight in standard time", () => {
    // Not Vancouver: tzdata 2026b keeps BC on UTC-7 all year from November
    // 2026, while older Node versions still switch it to UTC-8.
    const winter = new Date("2026-12-05T20:00:00Z"); // noon in Los Angeles (UTC-8)
    expect(endOfGymDay(winter, "America/Los_Angeles")).toEqual(new Date("2026-12-06T08:00:00Z"));
  });

  it("uses the gym's day, not the UTC day, late in the evening", () => {
    const lateEvening = new Date("2026-10-21T05:30:00Z"); // 10:30pm Oct 20 in Victoria
    expect(endOfGymDay(lateEvening, "America/Vancouver")).toEqual(new Date("2026-10-21T07:00:00Z"));
  });
});

describe("punchesLeft", () => {
  const now = new Date("2026-10-29T20:00:00Z");
  const card = (visitsLeft: number | null, expiresAt: Date | null = null) => ({
    startsAt: new Date("2026-10-01T00:00:00Z"),
    expiresAt,
    visitsLeft,
  });

  it("adds up the visits on every card in effect", () => {
    expect(punchesLeft([card(7), card(10)], now)).toBe(17);
  });

  it("leaves out ended, unstarted and empty cards", () => {
    const later = { startsAt: new Date("2026-11-01T00:00:00Z"), expiresAt: null, visitsLeft: 10 };
    expect(punchesLeft([card(5, new Date("2026-10-28T00:00:00Z")), later, card(0), card(null)], now)).toBe(0);
  });
});
