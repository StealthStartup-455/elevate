import { describe, expect, it } from "vitest";
import { startOfGymDay } from "./day";
import { addMonths, membershipStartsAt, passFor, voidedExpiry } from "./passes";
import type { Product } from "./types";

const TZ = "America/Vancouver";
const at = (iso: string) => new Date(iso);

const product = (kind: Product["kind"], extra: Partial<Product> = {}): Product => ({
  id: "p",
  name: "p",
  kind,
  priceCents: 100,
  punches: null,
  durationMonths: null,
  recurring: false,
  ...extra,
});

describe("addMonths", () => {
  it("keeps the day of the month", () => {
    expect(addMonths(at("2026-10-29T20:00:00Z"), 1).toISOString()).toBe("2026-11-29T20:00:00.000Z");
    expect(addMonths(at("2026-10-29T20:00:00Z"), 3).toISOString()).toBe("2027-01-29T20:00:00.000Z");
    expect(addMonths(at("2026-10-29T20:00:00Z"), 12).toISOString()).toBe("2027-10-29T20:00:00.000Z");
  });

  it("ends on the last day of a shorter month", () => {
    expect(addMonths(at("2027-01-31T12:00:00Z"), 1).toISOString()).toBe("2027-02-28T12:00:00.000Z");
    expect(addMonths(at("2028-01-31T12:00:00Z"), 1).toISOString()).toBe("2028-02-29T12:00:00.000Z");
  });
});

describe("membershipStartsAt", () => {
  const now = at("2026-10-29T20:00:00Z");

  it("starts now with no membership, or one that has ended", () => {
    expect(membershipStartsAt([], now)).toEqual(now);
    expect(
      membershipStartsAt([{ startsAt: at("2026-08-01T00:00:00Z"), expiresAt: at("2026-09-01T00:00:00Z") }], now),
    ).toEqual(now);
  });

  it("starts when the current membership, or an early renewal, ends", () => {
    const current = { startsAt: at("2026-10-14T00:00:00Z"), expiresAt: at("2026-11-14T00:00:00Z") };
    const renewal = { startsAt: at("2026-11-14T00:00:00Z"), expiresAt: at("2026-12-14T00:00:00Z") };
    expect(membershipStartsAt([current], now)).toEqual(current.expiresAt);
    expect(membershipStartsAt([renewal, current], now)).toEqual(renewal.expiresAt);
  });
});

describe("passFor", () => {
  const now = at("2026-10-29T20:00:00Z"); // 1 p.m. in Vancouver
  const opts = { now, timeZone: TZ, membershipStart: now };

  it("gives a day pass until midnight in the gym's time zone", () => {
    const pass = passFor(product("DAY"), opts)!;
    expect(pass.kind).toBe("DAY");
    expect(pass.expiresAt!.toISOString()).toBe("2026-10-30T07:00:00.000Z");
  });

  it("gives a punch card its punches and no end date", () => {
    expect(passFor(product("PUNCH", { punches: 10 }), opts)).toMatchObject({
      kind: "PUNCH",
      visitsLeft: 10,
      expiresAt: null,
    });
  });

  it("gives a membership its length, from the start it's given", () => {
    const start = at("2026-11-14T08:00:00Z");
    const pass = passFor(product("MEMBERSHIP", { durationMonths: 3 }), { ...opts, membershipStart: start })!;
    expect(pass.startsAt).toEqual(start);
    expect(pass.expiresAt!.toISOString()).toBe("2027-02-14T08:00:00.000Z");
    expect(pass.renews).toBe(false);
  });

  it("marks a monthly recurring membership as renewing", () => {
    expect(passFor(product("MEMBERSHIP", { durationMonths: 1, recurring: true }), opts)?.renews).toBe(true);
  });

  it("gives nothing for rentals and chalk", () => {
    expect(passFor(product("RENTAL"), opts)).toBeNull();
    expect(passFor(product("RETAIL"), opts)).toBeNull();
  });
});

describe("voidedExpiry", () => {
  it("ends a started pass now, and an unstarted one before it starts", () => {
    const now = at("2026-10-29T20:00:00Z");
    expect(voidedExpiry(at("2026-10-01T00:00:00Z"), now)).toEqual(now);
    expect(voidedExpiry(at("2026-11-14T00:00:00Z"), now)).toEqual(at("2026-11-14T00:00:00Z"));
  });
});

describe("startOfGymDay", () => {
  it("is midnight at the start of the gym's day", () => {
    // 1 p.m. on Oct 29 in Vancouver (daylight time, UTC-7).
    expect(startOfGymDay(at("2026-10-29T20:00:00Z"), TZ).toISOString()).toBe("2026-10-29T07:00:00.000Z");
    // 11 p.m. local is already the next day in UTC.
    expect(startOfGymDay(at("2026-10-30T06:00:00Z"), TZ).toISOString()).toBe("2026-10-29T07:00:00.000Z");
  });

  it("handles the 25 hour day when the clocks go back", () => {
    // Nov 1, 2026: 11:30 p.m. standard time (UTC-8). Los Angeles, not
    // Vancouver: tzdata 2026e keeps British Columbia on UTC-7 all year.
    expect(startOfGymDay(at("2026-11-02T07:30:00Z"), "America/Los_Angeles").toISOString()).toBe(
      "2026-11-01T07:00:00.000Z",
    );
  });
});
