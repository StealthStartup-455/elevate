import { describe, expect, it } from "vitest";
import {
  badgeAt,
  badgeFor,
  countByHour,
  deskHref,
  gymDay,
  gymHour,
  gymDayBounds,
  parseDay,
  parsePage,
  rowMessage,
  shiftDay,
  startOfGymDay,
  waiverLabel,
} from "./day";

const TZ = "America/Vancouver";
const at = (iso: string) => new Date(iso);

describe("gymDay", () => {
  it("is the gym's calendar day, not UTC's", () => {
    // 6 p.m. on Nov 3 in Victoria is already Nov 4 in UTC.
    expect(gymDay(at("2026-11-04T02:00:00Z"), TZ)).toBe("2026-11-03");
    expect(gymDay(at("2026-11-04T08:00:00Z"), TZ)).toBe("2026-11-04");
  });
});

describe("startOfGymDay", () => {
  it("is midnight in the gym's time zone", () => {
    expect(startOfGymDay(at("2026-11-03T20:00:00Z"), TZ)).toEqual(at("2026-11-03T08:00:00Z"));
  });

  it("is the same instant at midnight itself", () => {
    expect(startOfGymDay(at("2026-11-03T08:00:00Z"), TZ)).toEqual(at("2026-11-03T08:00:00Z"));
  });

  it("is still today late in the evening, after UTC has moved on", () => {
    expect(startOfGymDay(at("2026-11-04T07:59:00Z"), TZ)).toEqual(at("2026-11-03T08:00:00Z"));
  });

  it("handles the 25 hour day when the clocks go back", () => {
    // Nov 1 2026: midnight is still daylight time (UTC-7).
    expect(startOfGymDay(at("2026-11-01T20:00:00Z"), TZ)).toEqual(at("2026-11-01T07:00:00Z"));
  });

  it("handles the 23 hour day when the clocks go forward", () => {
    expect(startOfGymDay(at("2026-03-08T20:00:00Z"), TZ)).toEqual(at("2026-03-08T08:00:00Z"));
  });
});

describe("gymDayBounds", () => {
  const hours = (b: { start: Date; end: Date }) => (b.end.getTime() - b.start.getTime()) / 3_600_000;

  it("is midnight to midnight in the gym's time zone", () => {
    const b = gymDayBounds("2026-10-20", TZ);
    expect(b).toEqual({ start: at("2026-10-20T07:00:00Z"), end: at("2026-10-21T07:00:00Z") });
  });

  it("is 25 and 23 hours long on the days the clocks change", () => {
    expect(hours(gymDayBounds("2026-11-01", TZ))).toBe(25);
    expect(hours(gymDayBounds("2026-03-08", TZ))).toBe(23);
  });

  it("works for time zones ahead of UTC", () => {
    expect(gymDayBounds("2026-11-03", "Asia/Kolkata").start).toEqual(at("2026-11-02T18:30:00Z"));
    expect(gymDayBounds("2026-11-03", "Pacific/Kiritimati").start).toEqual(at("2026-11-02T10:00:00Z"));
    expect(gymDayBounds("2026-11-03", "UTC").start).toEqual(at("2026-11-03T00:00:00Z"));
  });
});

describe("parseDay", () => {
  const today = "2026-11-03";

  it("keeps a real day up to today", () => {
    expect(parseDay("2026-11-03", today)).toBe("2026-11-03");
    expect(parseDay("2025-02-28", today)).toBe("2025-02-28");
  });

  it("falls back to today for anything else", () => {
    for (const bad of [undefined, "", "today", "2026-2-3", "2026-02-30", "2026-13-01", "2026-11-04", ["2026-11-01"]]) {
      expect(parseDay(bad, today)).toBe(today);
    }
  });
});

describe("parsePage", () => {
  it("keeps a whole number from 1", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("3")).toBe(3);
  });

  it("falls back to page 1 for anything else", () => {
    for (const bad of [undefined, "", "0", "-1", "1.5", "abc", "1e3", "99999999999", ["2"]]) {
      expect(parsePage(bad)).toBe(1);
    }
  });
});

describe("shiftDay", () => {
  it("moves across months and years", () => {
    expect(shiftDay("2026-11-01", -1)).toBe("2026-10-31");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("countByHour", () => {
  it("counts check-ins by the gym's hour", () => {
    const hourly = countByHour(
      [at("2026-11-03T20:19:00Z"), at("2026-11-03T20:05:00Z"), at("2026-11-04T07:30:00Z")],
      TZ,
    );
    expect(hourly).toHaveLength(24);
    expect(hourly[12]).toBe(2);
    expect(hourly[23]).toBe(1);
    expect(hourly.reduce((a, b) => a + b, 0)).toBe(3);
  });
});

describe("gymHour", () => {
  it("is the hour on the gym's clock", () => {
    expect(gymHour(at("2026-11-03T20:19:00Z"), TZ)).toBe(12);
    expect(gymHour(at("2026-11-04T07:30:00Z"), TZ)).toBe(23);
    expect(gymHour(at("2026-11-03T08:05:00Z"), TZ)).toBe(0);
  });
});

describe("deskHref", () => {
  const today = "2026-11-03";

  it("leaves out today and page 1, so the plain page is the default", () => {
    expect(deskHref(today, today)).toBe("/desk");
    expect(deskHref(today, today, 1)).toBe("/desk");
  });

  it("keeps another day and page in the URL", () => {
    expect(deskHref("2026-11-02", today)).toBe("/desk?date=2026-11-02");
    expect(deskHref(today, today, 2)).toBe("/desk?page=2");
    expect(deskHref("2026-11-02", today, 3)).toBe("/desk?date=2026-11-02&page=3");
  });
});

describe("badgeFor", () => {
  const status = (s: Partial<Parameters<typeof badgeFor>[0]> = {}) => ({
    membershipStatus: "none" as const,
    hasDayPass: false,
    punchesLeft: 0,
    ...s,
  });

  it("follows checkInClimber's order: membership, day pass, punch card", () => {
    expect(badgeFor(status({ membershipStatus: "active", hasDayPass: true, punchesLeft: 3 }))).toBe("MEMBER");
    expect(badgeFor(status({ hasDayPass: true, punchesLeft: 3 }))).toBe("DAY_PASS");
    expect(badgeFor(status({ punchesLeft: 3 }))).toBe("PUNCH_CARD");
    expect(badgeFor(status())).toBe("NO_PASS");
  });

  it("doesn't count a paused or expired membership", () => {
    expect(badgeFor(status({ membershipStatus: "paused" }))).toBe("NO_PASS");
    expect(badgeFor(status({ membershipStatus: "expired", punchesLeft: 1 }))).toBe("PUNCH_CARD");
  });
});

describe("badgeAt", () => {
  const t = at("2026-10-20T18:00:00Z");
  const pass = (kind: "MEMBERSHIP" | "DAY" | "PUNCH", p: Partial<Parameters<typeof badgeAt>[0][number]> = {}) => ({
    kind,
    startsAt: at("2026-10-01T00:00:00Z"),
    expiresAt: null,
    pausedAt: null,
    visitsLeft: null,
    ...p,
  });

  it("is the pass that let them in at the time, even if it ended since", () => {
    expect(badgeAt([pass("DAY", { startsAt: at("2026-10-20T17:00:00Z"), expiresAt: at("2026-10-21T07:00:00Z") })], t)).toBe("DAY_PASS");
    expect(badgeAt([pass("MEMBERSHIP", { expiresAt: at("2026-10-20T19:00:00Z") })], t)).toBe("MEMBER");
  });

  it("is a punch card even when that visit used the last punch", () => {
    expect(badgeAt([pass("PUNCH", { visitsLeft: 0 })], t)).toBe("PUNCH_CARD");
  });

  it("ignores a pause that started after the visit", () => {
    expect(badgeAt([pass("MEMBERSHIP", { pausedAt: at("2026-10-20T19:00:00Z") })], t)).toBe("MEMBER");
    expect(badgeAt([pass("MEMBERSHIP", { pausedAt: at("2026-10-20T17:00:00Z") })], t)).toBe("NO_PASS");
  });

  it("ignores passes that started later or had ended", () => {
    expect(badgeAt([pass("DAY", { startsAt: at("2026-10-20T19:00:00Z") })], t)).toBe("NO_PASS");
    expect(badgeAt([pass("PUNCH", { expiresAt: at("2026-10-20T17:00:00Z"), visitsLeft: 5 })], t)).toBe("NO_PASS");
  });
});

describe("waiverLabel", () => {
  const today = "2026-11-03";

  it("says Valid for a waiver good for more than a week", () => {
    expect(waiverLabel({ status: "valid", expiresOn: "2027-03-01" }, today)).toEqual({ text: "Valid", tone: "normal" });
  });

  it("warns with the date when it runs out within 7 days", () => {
    expect(waiverLabel({ status: "valid", expiresOn: "2026-11-08" }, today)).toEqual({ text: "Expires Nov 8", tone: "warning" });
    expect(waiverLabel({ status: "valid", expiresOn: "2026-11-10" }, today).tone).toBe("warning");
    expect(waiverLabel({ status: "valid", expiresOn: "2026-11-11" }, today).text).toBe("Valid");
  });

  it("flags an expired or missing waiver", () => {
    expect(waiverLabel({ status: "expired", expiresOn: "2026-09-12" }, today)).toEqual({ text: "Expired", tone: "error" });
    expect(waiverLabel({ status: "missing" }, today)).toEqual({ text: "Not signed", tone: "error" });
  });
});

describe("rowMessage", () => {
  const today = "2026-11-03"; // a Tuesday
  const row = (r: Partial<Parameters<typeof rowMessage>[0]> = {}) =>
    rowMessage({
      badge: "MEMBER",
      punchesLeft: 0,
      waiver: { status: "valid", expiresOn: "2027-03-01" },
      today,
      firstVisit: false,
      latestVisit: true,
      ...r,
    });

  it("says what let them in", () => {
    expect(row()).toEqual({ text: "Gym access", tone: "normal" });
    expect(row({ badge: "DAY_PASS" })).toEqual({ text: "Day pass", tone: "normal" });
    expect(row({ badge: "PUNCH_CARD", punchesLeft: 4 })).toEqual({ text: "4 visits left", tone: "normal" });
    expect(row({ badge: "PUNCH_CARD", punchesLeft: 1 }).text).toBe("1 visit left");
    expect(row({ badge: "NO_PASS" })).toEqual({ text: "No pass", tone: "error" });
  });

  it("calls out a first visit", () => {
    expect(row({ badge: "DAY_PASS", firstVisit: true })).toEqual({ text: "First visit", tone: "normal" });
  });

  it("warns when that visit used the last punch", () => {
    expect(row({ badge: "PUNCH_CARD", punchesLeft: 0 })).toEqual({ text: "Last visit on the card", tone: "warning" });
    expect(row({ badge: "PUNCH_CARD", punchesLeft: 0, firstVisit: true }).text).toBe("Last visit on the card");
  });

  it("only counts punches on the climber's latest visit, since older counts are gone", () => {
    expect(row({ badge: "PUNCH_CARD", punchesLeft: 0, latestVisit: false })).toEqual({ text: "Punch card", tone: "normal" });
  });

  it("puts a waiver about to run out first", () => {
    const soon = (expiresOn: string) => row({ waiver: { status: "valid", expiresOn }, firstVisit: true }).text;
    expect(soon("2026-11-03")).toBe("Waiver expires today");
    expect(soon("2026-11-04")).toBe("Waiver expires tomorrow");
    expect(soon("2026-11-08")).toBe("Waiver expires Sunday");
    // A week out is the same weekday as today, so it says the date.
    expect(soon("2026-11-10")).toBe("Waiver expires Nov 10");
    expect(row({ waiver: { status: "valid", expiresOn: "2026-11-08" } }).tone).toBe("warning");
  });

  it("flags a waiver that has run out since", () => {
    expect(row({ waiver: { status: "expired", expiresOn: "2026-11-01" } })).toEqual({ text: "Waiver expired", tone: "error" });
    expect(row({ waiver: { status: "missing" } })).toEqual({ text: "No waiver", tone: "error" });
  });
});
