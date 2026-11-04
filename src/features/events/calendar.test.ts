import { describe, expect, it } from "vitest";
import { addMonths, calendarMonths, formatMonth, monthGrid, monthOf } from "./calendar";

describe("monthGrid", () => {
  it("lays November 2026 out Monday first, padding the weeks either side", () => {
    const weeks = monthGrid("2026-11");
    // Nov 1, 2026 is a Sunday: six empty days before it.
    expect(weeks[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(weeks[1][0]).toBe("2026-11-02");
    expect(weeks.at(-1)).toEqual(["2026-11-30", null, null, null, null, null, null]);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });

  it("needs no padding for a month that starts on Monday and ends on Sunday", () => {
    // February 2027 starts on a Monday and has 28 days.
    const weeks = monthGrid("2027-02");
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().includes(null)).toBe(false);
  });

  it("counts a leap day", () => {
    expect(monthGrid("2028-02").flat().filter(Boolean).at(-1)).toBe("2028-02-29");
  });
});

describe("months", () => {
  it("moves across a year", () => {
    expect(addMonths("2026-11", 2)).toBe("2027-01");
    expect(addMonths("2027-01", -1)).toBe("2026-12");
    expect(monthOf("2026-11-05")).toBe("2026-11");
    expect(formatMonth("2026-11")).toBe("November 2026");
  });

  it("offers today's month up to the month of the last thing on the calendar", () => {
    expect(calendarMonths("2026-11-03", [])).toEqual(["2026-11"]);
    expect(calendarMonths("2026-11-03", ["2026-11-20", "2027-01-02", "2026-12-01"])).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
    ]);
    // Something that started before today (an event on now) doesn't add past months.
    expect(calendarMonths("2026-11-03", ["2026-10-30"])).toEqual(["2026-11"]);
  });
});
