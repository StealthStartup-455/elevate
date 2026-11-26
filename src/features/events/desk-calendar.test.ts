import { describe, expect, it } from "vitest";
import {
  countByKind,
  dayForKey,
  dayInMonth,
  daysOfMonth,
  groupByDay,
  monthBounds,
  parseDay,
  type DeskCalendarEntry,
} from "./desk-calendar";
import { gymTime } from "./time";

const ZONE = "America/Vancouver";
// Not Vancouver: newer time zone data has it stay on one time all year from 2026.
const CLOCK_CHANGE_ZONE = "America/Toronto";
const at = (day: string, hour: number, minute = 0) => gymTime(day, hour * 60 + minute, ZONE);

function entry(over: Partial<DeskCalendarEntry> & Pick<DeskCalendarEntry, "startsAt">): DeskCalendarEntry {
  return { id: "1", kind: "event", title: "Event", details: null, endsAt: null, canceled: false, classInfo: null, ...over };
}

/** Each day with its titles and times, for short comparisons. */
function shape(month: string, entries: DeskCalendarEntry[], zone = ZONE) {
  return Object.fromEntries(
    Object.entries(groupByDay(month, entries, zone)).map(([d, items]) => [d, items.map((i) => `${i.title}: ${i.time}`)]),
  );
}

describe("groupByDay", () => {
  it("puts an item on its day on the gym's clock, not in UTC", () => {
    // 8 PM on Nov 5 in Vancouver is already Nov 6 in UTC.
    const late = entry({ title: "Film", startsAt: at("2026-11-05", 20), endsAt: at("2026-11-05", 22) });
    expect(late.startsAt.toISOString().slice(0, 10)).toBe("2026-11-06");
    expect(shape("2026-11", [late])).toEqual({ "2026-11-05": ["Film: 8 PM – 10 PM"] });
  });

  it("sorts a day by time, whatever the kind", () => {
    const items = [
      entry({ id: "a", title: "Late", startsAt: at("2026-11-05", 18) }),
      entry({ id: "b", kind: "setChange", title: "Cave", startsAt: at("2026-11-05", 9), endsAt: at("2026-11-05", 14) }),
      entry({ id: "c", kind: "class", title: "Intro", startsAt: at("2026-11-05", 12), endsAt: at("2026-11-05", 13) }),
    ];
    expect(shape("2026-11", items)["2026-11-05"]).toEqual(["Cave: 9 AM – 2 PM", "Intro: 12 PM – 1 PM", "Late: 6 PM"]);
  });

  it("shows something that runs over several days on every day it covers, first in those after", () => {
    const items = [
      entry({ id: "a", title: "Morning", startsAt: at("2026-11-06", 8) }),
      entry({ id: "b", title: "Fest", startsAt: at("2026-11-05", 10), endsAt: at("2026-11-07", 14) }),
    ];
    expect(shape("2026-11", items)).toEqual({
      "2026-11-05": ["Fest: From 10 AM"],
      "2026-11-06": ["Fest: All day", "Morning: 8 AM"],
      "2026-11-07": ["Fest: Until 2 PM"],
    });
  });

  it("splits a span across months, each month with its own days", () => {
    const reset = entry({ kind: "setChange", title: "Cave", startsAt: at("2026-11-29", 9), endsAt: at("2026-12-02", 14) });
    expect(Object.keys(groupByDay("2026-11", [reset], ZONE))).toEqual(["2026-11-29", "2026-11-30"]);
    expect(shape("2026-12", [reset])).toEqual({ "2026-12-01": ["Cave: All day"], "2026-12-02": ["Cave: Until 2 PM"] });
    expect(groupByDay("2027-01", [reset], ZONE)).toEqual({});
  });

  it("covers a whole month for something that started long before it and ends long after", () => {
    const long = entry({ startsAt: at("2020-01-01", 9), endsAt: at("2030-01-01", 9) });
    expect(Object.keys(groupByDay("2026-11", [long], ZONE))).toHaveLength(30);
  });

  it("keeps an end at midnight on the day before", () => {
    const party = entry({ title: "Party", startsAt: at("2026-11-05", 20), endsAt: at("2026-11-06", 0) });
    expect(shape("2026-11", [party])).toEqual({ "2026-11-05": ["Party: 8 PM – 12 AM"] });
    const weekend = entry({ title: "Fest", startsAt: at("2026-11-07", 9), endsAt: at("2026-11-09", 0) });
    expect(shape("2026-11", [weekend])).toEqual({ "2026-11-07": ["Fest: From 9 AM"], "2026-11-08": ["Fest: All day"] });
  });

  it("carries a class past midnight onto the next day", () => {
    const night = entry({ kind: "class", title: "Night", startsAt: at("2026-11-30", 23), endsAt: at("2026-12-01", 1) });
    expect(shape("2026-11", [night])).toEqual({ "2026-11-30": ["Night: From 11 PM"] });
    expect(shape("2026-12", [night])).toEqual({ "2026-12-01": ["Night: Until 1 AM"] });
  });

  it("shows an event with no end, or one ending before it starts, on its first day", () => {
    expect(shape("2026-11", [entry({ startsAt: at("2026-11-05", 19) })])).toEqual({ "2026-11-05": ["Event: 7 PM"] });
    const backwards = entry({ startsAt: at("2026-11-05", 19), endsAt: at("2026-11-04", 19) });
    expect(shape("2026-11", [backwards])).toEqual({ "2026-11-05": ["Event: 7 PM"] });
  });

  it("reads the clock right on both sides of a clock change", () => {
    // Toronto's clocks go back on Nov 1, 2026 and forward on Mar 14, 2027.
    const toronto = (day: string, hour: number, minute = 0) => gymTime(day, hour * 60 + minute, CLOCK_CHANGE_ZONE);
    const back = entry({ title: "Back", startsAt: toronto("2026-11-01", 0, 30), endsAt: toronto("2026-11-01", 23, 30) });
    expect(back.endsAt!.getTime() - back.startsAt.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(shape("2026-11", [back], CLOCK_CHANGE_ZONE)).toEqual({ "2026-11-01": ["Back: 12:30 AM – 11:30 PM"] });
    const forward = entry({ title: "Forward", startsAt: toronto("2027-03-13", 22), endsAt: toronto("2027-03-14", 22) });
    expect(forward.endsAt!.getTime() - forward.startsAt.getTime()).toBe(23 * 60 * 60 * 1000);
    expect(shape("2027-03", [forward], CLOCK_CHANGE_ZONE)).toEqual({
      "2027-03-13": ["Forward: From 10 PM"],
      "2027-03-14": ["Forward: Until 10 PM"],
    });
  });

  it("keeps canceled items and who signed up", () => {
    const classInfo = { instructor: "Sam", capacity: 10, signedUp: [{ climberId: "c1", name: "Ana Test" }] };
    const [item] = groupByDay("2026-11", [entry({ kind: "class", canceled: true, classInfo, startsAt: at("2026-11-05", 18) })], ZONE)["2026-11-05"];
    expect(item).toMatchObject({ canceled: true, classInfo });
  });
});

describe("countByKind", () => {
  it("counts what's still on", () => {
    const items = groupByDay(
      "2026-11",
      [
        entry({ id: "a", kind: "class", startsAt: at("2026-11-05", 9) }),
        entry({ id: "b", kind: "class", startsAt: at("2026-11-05", 10) }),
        entry({ id: "c", kind: "class", canceled: true, startsAt: at("2026-11-05", 11) }),
        entry({ id: "d", kind: "setChange", startsAt: at("2026-11-05", 12) }),
      ],
      ZONE,
    )["2026-11-05"];
    expect(countByKind(items)).toEqual({ class: 2, event: 0, setChange: 1 });
  });
});

describe("days and months", () => {
  it("takes a real day from the address, and today for anything else", () => {
    expect(parseDay("2026-12-31", "2026-11-05")).toBe("2026-12-31");
    expect(parseDay("2028-02-29", "2026-11-05")).toBe("2028-02-29");
    for (const bad of [undefined, null, "", "2026-02-30", "2026-13-01", "2026-11", "9999-01-01", "nope", ["2026-12-31"]]) {
      expect(parseDay(bad, "2026-11-05")).toBe("2026-11-05");
    }
  });

  it("lists a month's days and its bounds on the gym's clock", () => {
    expect(daysOfMonth("2028-02")).toHaveLength(29);
    // EDT (UTC-4) when November 2026 starts, EST (UTC-5) when it ends.
    expect(monthBounds("2026-11", CLOCK_CHANGE_ZONE)).toEqual({
      from: new Date("2026-11-01T04:00:00Z"),
      to: new Date("2026-12-01T05:00:00Z"),
    });
  });

  it("opens a month on today, or on its first day", () => {
    expect(dayInMonth("2026-11", "2026-11-24")).toBe("2026-11-24");
    expect(dayInMonth("2026-12", "2026-11-24")).toBe("2026-12-01");
  });
});

describe("dayForKey", () => {
  it("moves by day, week, the week's ends and month", () => {
    // Nov 25, 2026 is a Wednesday (2).
    const go = (key: string) => dayForKey(key, "2026-11-25", 2);
    expect(go("ArrowLeft")).toBe("2026-11-24");
    expect(go("ArrowRight")).toBe("2026-11-26");
    expect(go("ArrowUp")).toBe("2026-11-18");
    expect(go("ArrowDown")).toBe("2026-12-02");
    expect(go("Home")).toBe("2026-11-23");
    expect(go("End")).toBe("2026-11-29");
    expect(go("PageUp")).toBe("2026-10-25");
    expect(go("PageDown")).toBe("2026-12-25");
    expect(go("Enter")).toBeNull();
  });

  it("stops at the end of a shorter month", () => {
    expect(dayForKey("PageDown", "2027-01-31", 6)).toBe("2027-02-28");
  });
});
