import { describe, expect, it } from "vitest";
import {
  activeWindowStart,
  busynessPercent,
  formatWindow,
  getBusynessLevel,
  gymClock,
  heatLevel,
} from "./busyness";

const thresholds = { mediumAt: 20, highAbove: 40 };

describe("busyness", () => {
  it.each([
    [0, "low"],
    [19, "low"],
    [20, "medium"],
    [40, "medium"],
    [41, "high"],
  ] as const)("%i climbers is %s", (count, level) => {
    expect(getBusynessLevel(count, thresholds)).toBe(level);
  });

  it("counts check-ins from the last two hours", () => {
    const now = new Date("2026-10-20T18:00:00Z");
    expect(activeWindowStart(now, 120).toISOString()).toBe("2026-10-20T16:00:00.000Z");
  });

  it("describes the window", () => {
    expect(formatWindow(120)).toBe("2 hours");
    expect(formatWindow(60)).toBe("hour");
    expect(formatWindow(90)).toBe("90 minutes");
  });

  it("fills the bar at 1.5 times the high threshold, never above 100", () => {
    expect(busynessPercent(30, thresholds)).toBe(50);
    expect(busynessPercent(500, thresholds)).toBe(100);
  });

  it("shades the heat map from 0 to 4", () => {
    expect([0, 10, 20, 30, 41].map((n) => heatLevel(n, thresholds))).toEqual([0, 1, 2, 3, 4]);
  });

  it("reads the gym's wall clock in its time zone", () => {
    // 01:30 UTC on Tuesday is 18:30 on Monday in Vancouver (PDT).
    expect(gymClock(new Date("2026-10-20T01:30:00Z"), "America/Vancouver")).toEqual({
      day: 0,
      hour: 18,
    });
  });
});
