import { describe, expect, it } from "vitest";
import {
  describeHours,
  describeStatus,
  hourRange,
  isOpenDuring,
  openStatus,
  weekAhead,
  type SpecialDay,
  type WeeklyHours,
} from "./hours";
import { gymTime } from "./time";

const LA = "America/Los_Angeles";
const h = (hour: number, minute = 0) => hour * 60 + minute;

// Monday to Friday 6 AM to 10 PM, Saturday 9 to 8, no row for Sunday.
const WEEK: WeeklyHours[] = [
  ...[0, 1, 2, 3, 4].map((weekday) => ({ weekday, closed: false, opensAt: h(6), closesAt: h(22) })),
  { weekday: 5, closed: false, opensAt: h(9), closesAt: h(20) },
];
const HOLIDAY: SpecialDay = { day: "2026-11-04", closed: true, opensAt: null, closesAt: null, note: "Staff training" };

// Monday, Nov 2, 2026 at `minutes` on the gym's clock.
const monday = (minutes: number) => gymTime("2026-11-02", minutes, LA);

describe("weekAhead", () => {
  const days = weekAhead(monday(h(10)), LA, WEEK, [HOLIDAY]);

  it("lists seven days from today", () => {
    expect(days.map((d) => d.label)).toEqual(["Today", "Tomorrow", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(days[0]).toMatchObject({ day: "2026-11-02", date: "Nov 2", hours: { opensAt: h(6), closesAt: h(22) } });
  });

  it("uses a special day over the regular week", () => {
    expect(days[2]).toMatchObject({ day: "2026-11-04", hours: null, special: true, note: "Staff training" });
  });

  it("closes a weekday with no hours", () => {
    expect(days[6]).toMatchObject({ day: "2026-11-08", hours: null, special: false });
  });

  it("closes a weekday marked closed", () => {
    const closedFriday = WEEK.map((w) => (w.weekday === 4 ? { ...w, closed: true } : w));
    expect(weekAhead(monday(h(10)), LA, closedFriday, [])[4].hours).toBeNull();
  });

  it("gives special hours on a day", () => {
    const short: SpecialDay = { day: "2026-11-05", closed: false, opensAt: h(10), closesAt: h(16), note: null };
    expect(weekAhead(monday(h(10)), LA, WEEK, [short])[3]).toMatchObject({
      hours: { opensAt: h(10), closesAt: h(16) },
      special: true,
    });
  });
});

describe("openStatus", () => {
  it("is open during the day's hours, until closing", () => {
    const now = monday(h(10));
    const status = openStatus(now, LA, weekAhead(now, LA, WEEK, []));
    expect(status).toEqual({ open: true, closesAt: h(22) });
    expect(describeStatus(status)).toBe("Closes at 10 PM");
  });

  it("opens later today before opening time", () => {
    const now = monday(h(5));
    expect(describeStatus(openStatus(now, LA, weekAhead(now, LA, WEEK, [])))).toBe("Opens at 6 AM");
  });

  it("opens tomorrow after closing", () => {
    const now = monday(h(22, 30));
    expect(describeStatus(openStatus(now, LA, weekAhead(now, LA, WEEK, [])))).toBe("Opens tomorrow at 6 AM");
  });

  it("skips closed days", () => {
    // Saturday after closing; Sunday has no hours, so Monday is next.
    const now = gymTime("2026-11-07", h(21), LA);
    const status = openStatus(now, LA, weekAhead(now, LA, WEEK, []));
    expect(status).toMatchObject({ open: false, next: { offset: 2, opensAt: h(6) } });
    expect(describeStatus(status)).toBe("Opens Mon at 6 AM");
  });

  it("says when nothing opens all week", () => {
    const now = monday(h(10));
    expect(describeStatus(openStatus(now, LA, weekAhead(now, LA, [], [])))).toBe("Closed for the next week");
  });

  it("closes at midnight", () => {
    const late = WEEK.map((w) => (w.weekday === 0 ? { ...w, closesAt: h(24) } : w));
    const now = monday(h(23, 30));
    expect(describeStatus(openStatus(now, LA, weekAhead(now, LA, late, [])))).toBe("Closes at midnight");
  });
});

describe("busyness strips", () => {
  it("cover the earliest opening to the latest closing", () => {
    const days = weekAhead(monday(h(10)), LA, WEEK, []);
    expect(hourRange(days)).toEqual({ from: 6, to: 22 });
    expect(hourRange(weekAhead(monday(h(10)), LA, [], []))).toBeNull();
  });

  it("count an hour as open if any of it is", () => {
    const hours = { opensAt: h(9, 30), closesAt: h(20) };
    expect(isOpenDuring(hours, 8)).toBe(false);
    expect(isOpenDuring(hours, 9)).toBe(true);
    expect(isOpenDuring(hours, 19)).toBe(true);
    expect(isOpenDuring(hours, 20)).toBe(false);
    expect(isOpenDuring(null, 12)).toBe(false);
  });

  it("describe a day's hours", () => {
    expect(describeHours({ opensAt: h(6), closesAt: h(22) })).toBe("6 AM – 10 PM");
    expect(describeHours(null)).toBe("Closed");
  });
});
