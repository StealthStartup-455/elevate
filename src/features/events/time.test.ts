import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  formatClock,
  formatClockRange,
  formatDay,
  formatSpan,
  gymClockAt,
  gymTime,
  weekdayOf,
} from "./time";

// Los Angeles, not Vancouver: tzdata 2026b keeps BC on UTC-7 all year from
// November, so it has no clock change to test. LA falls back on Nov 1, 2026.
const LA = "America/Los_Angeles";

describe("gymClockAt", () => {
  it("reads the day, weekday and time on the gym's clock", () => {
    // 04:04 UTC on Tuesday is 8:04 PM on Monday in LA (PST).
    expect(gymClockAt(new Date("2026-11-03T04:04:00Z"), LA)).toEqual({
      day: "2026-11-02",
      weekday: 0,
      minutes: 20 * 60 + 4,
    });
  });

  it("reads midnight as 0", () => {
    expect(gymClockAt(new Date("2026-11-03T08:00:00Z"), LA)).toMatchObject({ day: "2026-11-03", minutes: 0 });
  });
});

describe("gymTime", () => {
  it("turns a wall-clock time into the moment, before and after the clocks change", () => {
    expect(gymTime("2026-10-20", 6 * 60, LA)).toEqual(new Date("2026-10-20T13:00:00Z"));
    expect(gymTime("2026-11-02", 6 * 60, LA)).toEqual(new Date("2026-11-02T14:00:00Z"));
  });

  it("is right on the day the clocks go back", () => {
    expect(gymTime("2026-11-01", 12 * 60, LA)).toEqual(new Date("2026-11-01T20:00:00Z"));
  });

  it("round-trips with gymClockAt", () => {
    const at = gymTime("2026-12-24", 18 * 60 + 30, LA);
    expect(gymClockAt(at, LA)).toMatchObject({ day: "2026-12-24", minutes: 18 * 60 + 30 });
  });
});

describe("calendar days", () => {
  it("adds days across a month end", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-11-02", -2)).toBe("2026-10-31");
  });

  it("numbers weekdays from Monday", () => {
    expect(weekdayOf("2026-11-02")).toBe(0);
    expect(weekdayOf("2026-11-08")).toBe(6);
  });

  it("counts whole days between", () => {
    expect(daysBetween("2026-11-02", "2026-11-14")).toBe(12);
  });
});

describe("formatting", () => {
  it("writes clock times the way the style guide does", () => {
    expect(formatClock(6 * 60)).toBe("6 AM");
    expect(formatClock(21 * 60 + 30)).toBe("9:30 PM");
    expect(formatClock(12 * 60)).toBe("12 PM");
    expect(formatClock(0)).toBe("12 AM");
    expect(formatClock(24 * 60)).toBe("12 AM");
    expect(formatClockRange(6 * 60, 22 * 60)).toBe("6 AM – 10 PM");
  });

  it("writes a day", () => {
    expect(formatDay("2026-11-05")).toBe("Thu, Nov 5");
  });

  it("writes a span on one day, ending at midnight, or over several days", () => {
    const start = gymTime("2026-11-05", 18 * 60, LA);
    expect(formatSpan(start, gymTime("2026-11-05", 19 * 60 + 30, LA), LA)).toBe("Thu, Nov 5 · 6 PM – 7:30 PM");
    expect(formatSpan(start, gymTime("2026-11-06", 0, LA), LA)).toBe("Thu, Nov 5 · 6 PM – 12 AM");
    expect(formatSpan(start, gymTime("2026-11-07", 14 * 60, LA), LA)).toBe("Thu, Nov 5, 6 PM – Sat, Nov 7, 2 PM");
    expect(formatSpan(start, null, LA)).toBe("Thu, Nov 5 · 6 PM");
  });
});
