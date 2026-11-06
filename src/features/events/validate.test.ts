import { describe, expect, it } from "vitest";
import { gymTime } from "./time";
import {
  checkClassSession,
  checkClassType,
  checkEvent,
  checkSetChange,
  checkSpecialDay,
  checkWeek,
  parseClock,
  parseDateTime,
  parseDay,
} from "./validate";

const LA = "America/Los_Angeles";
const NOW = new Date("2026-11-02T20:00:00Z");

const fullWeek = () =>
  Array.from({ length: 7 }, (_, weekday) => ({ weekday, closed: false, opensAt: "06:00", closesAt: "22:00" }));

describe("parsing", () => {
  it("takes real calendar days only", () => {
    expect(parseDay("2026-11-05")).toBe("2026-11-05");
    expect(parseDay("2026-02-30")).toBeNull();
    expect(parseDay("Nov 5")).toBeNull();
  });

  it("reads clock times, with midnight as a closing time", () => {
    expect(parseClock("06:30")).toBe(390);
    expect(parseClock("00:00")).toBe(0);
    expect(parseClock("00:00", true)).toBe(1440);
    expect(parseClock("24:00")).toBeNull();
    expect(parseClock("6pm")).toBeNull();
  });

  it("reads a date and time on the gym's clock", () => {
    expect(parseDateTime("2026-11-05T18:00", LA)).toEqual(gymTime("2026-11-05", 18 * 60, LA));
    expect(parseDateTime("2026-11-05T18:00:00", LA)).toEqual(gymTime("2026-11-05", 18 * 60, LA));
    expect(parseDateTime("2026-11-05", LA)).toBeNull();
  });
});

describe("checkWeek", () => {
  it("takes all seven days", () => {
    const result = checkWeek(fullWeek());
    expect(result.ok && result.data).toHaveLength(7);
    expect(checkWeek(fullWeek().slice(1)).ok).toBe(false);
  });

  it("needs closing after opening on open days", () => {
    const week = fullWeek();
    week[2] = { ...week[2], opensAt: "22:00", closesAt: "06:00" };
    expect(checkWeek(week)).toEqual({ ok: false, message: "Closing time has to be after opening time." });
  });

  it("keeps a closed day's times, without checking them", () => {
    const week = fullWeek();
    week[6] = { weekday: 6, closed: true, opensAt: "", closesAt: "" };
    const result = checkWeek(week);
    expect(result.ok && result.data[6]).toEqual({ weekday: 6, closed: true, opensAt: 360, closesAt: 1320 });
  });

  it("lets a day close at midnight", () => {
    const week = fullWeek();
    week[4] = { ...week[4], closesAt: "00:00" };
    const result = checkWeek(week);
    expect(result.ok && result.data[4].closesAt).toBe(1440);
  });
});

describe("checkSpecialDay", () => {
  it("takes a closed day without times", () => {
    expect(checkSpecialDay({ date: "2026-11-11", closed: true, note: " Remembrance Day " })).toEqual({
      ok: true,
      data: { day: "2026-11-11", closed: true, opensAt: null, closesAt: null, note: "Remembrance Day" },
    });
  });

  it("needs times when open", () => {
    expect(checkSpecialDay({ date: "2026-11-11", closed: false }).ok).toBe(false);
    expect(checkSpecialDay({ date: "2026-11-11", closed: false, opensAt: "10:00", closesAt: "16:00" }).ok).toBe(true);
  });

  it("needs a date", () => {
    expect(checkSpecialDay({ date: "", closed: true })).toEqual({ ok: false, message: "Pick a date." });
  });
});

describe("checkEvent", () => {
  it("takes a name and a start, with the end optional", () => {
    const result = checkEvent({ title: "Comp", startsAt: "2026-11-14T10:00", endsAt: "" }, LA);
    expect(result).toEqual({
      ok: true,
      data: { title: "Comp", details: null, startsAt: gymTime("2026-11-14", 600, LA), endsAt: null },
    });
  });

  it("refuses an end before the start", () => {
    const result = checkEvent({ title: "Comp", startsAt: "2026-11-14T10:00", endsAt: "2026-11-14T09:00" }, LA);
    expect(result).toEqual({ ok: false, message: "It has to end after it starts." });
  });

  it("refuses a missing or long name", () => {
    expect(checkEvent({ title: " ", startsAt: "2026-11-14T10:00" }, LA).ok).toBe(false);
    expect(checkEvent({ title: "x".repeat(81), startsAt: "2026-11-14T10:00" }, LA).ok).toBe(false);
  });
});

describe("checkSetChange", () => {
  it("needs a wall and the new routes opening after it closes", () => {
    expect(checkSetChange({ wall: "Cave", startsAt: "2026-11-04T09:00", endsAt: "2026-11-04T14:00" }, LA).ok).toBe(true);
    expect(checkSetChange({ wall: "", startsAt: "2026-11-04T09:00", endsAt: "2026-11-04T14:00" }, LA).ok).toBe(false);
    expect(checkSetChange({ wall: "Cave", startsAt: "2026-11-04T14:00", endsAt: "2026-11-04T09:00" }, LA).ok).toBe(false);
  });
});

describe("checkClassType", () => {
  const base = { name: "Intro", durationMinutes: "60", capacity: "8" };

  it("takes a name, a length and places", () => {
    const result = checkClassType({ ...base, instructor: " Sam " });
    expect(result).toEqual({
      ok: true,
      data: { name: "Intro", details: null, instructor: "Sam", durationMinutes: 60, capacity: 8 },
    });
  });

  it("refuses a missing name, or places or a length out of range", () => {
    expect(checkClassType({ ...base, name: " " })).toEqual({ ok: false, message: "Give the class a name." });
    expect(checkClassType({ ...base, capacity: "0" }).ok).toBe(false);
    expect(checkClassType({ ...base, capacity: "2.5" }).ok).toBe(false);
    expect(checkClassType({ ...base, durationMinutes: "5" }).ok).toBe(false);
  });
});

describe("checkClassSession", () => {
  const typeId = "6f1c2c1e-1d2b-4b7a-9a0e-5f8e2b6c3d4a";
  const base = { classTypeId: typeId, startsAt: "2026-11-05T18:00" };

  it("takes a type and a future start, with the type's instructor and places by default", () => {
    expect(checkClassSession(base, LA, NOW)).toEqual({
      ok: true,
      data: { classTypeId: typeId, startsAt: gymTime("2026-11-05", 18 * 60, LA), instructor: null, capacity: null },
    });
  });

  it("takes its own instructor and places", () => {
    const result = checkClassSession({ ...base, instructor: "Priya", capacity: "4" }, LA, NOW);
    expect(result.ok && result.data).toMatchObject({ instructor: "Priya", capacity: 4 });
  });

  it("refuses no type, a past start, or bad places", () => {
    expect(checkClassSession({ ...base, classTypeId: "" }, LA, NOW)).toEqual({ ok: false, message: "Pick a class type." });
    expect(checkClassSession({ ...base, startsAt: "2026-11-01T18:00" }, LA, NOW)).toEqual({
      ok: false,
      message: "Pick a time that hasn't passed yet.",
    });
    expect(checkClassSession({ ...base, capacity: "0" }, LA, NOW).ok).toBe(false);
  });
});
