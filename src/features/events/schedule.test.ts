import { describe, expect, it } from "vitest";
import { describeMoment, describeSpots, eventEnd, setChangeState, spotsLeft, startsIn } from "./schedule";
import { gymTime } from "./time";

const LA = "America/Los_Angeles";
const at = (day: string, hour: number) => gymTime(day, hour * 60, LA);
const NOW = at("2026-11-02", 16);

describe("events", () => {
  it("end at their end time, or at midnight when they have none", () => {
    expect(eventEnd(at("2026-11-05", 18), at("2026-11-05", 21), LA)).toEqual(at("2026-11-05", 21));
    expect(eventEnd(at("2026-11-05", 18), null, LA)).toEqual(gymTime("2026-11-06", 0, LA));
  });

  it("say when they start, by calendar day", () => {
    expect(startsIn(NOW, at("2026-11-02", 19), LA)).toBe("Today");
    // Late tonight to early tomorrow is still tomorrow.
    expect(startsIn(at("2026-11-02", 23), at("2026-11-03", 1), LA)).toBe("Tomorrow");
    expect(startsIn(NOW, at("2026-11-14", 10), LA)).toBe("In 12 days");
    expect(startsIn(NOW, at("2026-11-02", 10), LA)).toBe("On now");
  });
});

describe("set changes", () => {
  const start = at("2026-11-04", 9);
  const end = at("2026-11-04", 14);

  it("are coming up, closed now, then new", () => {
    expect(setChangeState(NOW, start, end)).toBe("coming");
    expect(setChangeState(at("2026-11-04", 10), start, end)).toBe("now");
    expect(setChangeState(at("2026-11-04", 14), start, end)).toBe("new");
  });

  it("say when the new routes open", () => {
    expect(describeMoment(at("2026-11-04", 10), end, LA)).toBe("today at 2 PM");
    expect(describeMoment(at("2026-11-03", 10), end, LA)).toBe("tomorrow at 2 PM");
    expect(describeMoment(NOW, end, LA)).toBe("Wed, Nov 4 at 2 PM");
  });
});

describe("class places", () => {
  it("never go below zero", () => {
    expect(spotsLeft(8, 3)).toBe(5);
    expect(spotsLeft(6, 7)).toBe(0);
  });

  it("read as places left or full", () => {
    expect(describeSpots(3)).toBe("3 spots left");
    expect(describeSpots(1)).toBe("1 spot left");
    expect(describeSpots(0)).toBe("Full");
  });
});
