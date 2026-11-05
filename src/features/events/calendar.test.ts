import { describe, expect, it } from "vitest";
import { addMonths, calendarEnd, calendarMonths, formatMonth, monthGrid, monthOf } from "./calendar";

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

  it("offers a year from today's month, ending on the last day of the last month", () => {
    const months = calendarMonths("2026-11-03");
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2026-11");
    expect(months.at(-1)).toBe("2027-10");
    expect(calendarEnd("2026-11-03")).toBe("2027-10-31");
    // A last month of February ends on the 28th, or the 29th in a leap year.
    expect(calendarEnd("2026-03-15")).toBe("2027-02-28");
    expect(calendarEnd("2027-03-01")).toBe("2028-02-29");
  });
});
