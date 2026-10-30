import { describe, expect, it } from "vitest";
import { ACTIVE_MEMBERSHIP_NOTICE, canBuyOnline, isSoldOnline, purchaseWarnings } from "./catalog";

describe("isSoldOnline", () => {
  it("offers passes and memberships, not rentals or chalk", () => {
    expect(isSoldOnline("DAY")).toBe(true);
    expect(isSoldOnline("PUNCH")).toBe(true);
    expect(isSoldOnline("MEMBERSHIP")).toBe(true);
    expect(isSoldOnline("RENTAL")).toBe(false);
    expect(isSoldOnline("RETAIL")).toBe(false);
  });
});

describe("canBuyOnline", () => {
  it("is off only for an active membership", () => {
    expect(canBuyOnline("active")).toBe(false);
    expect(canBuyOnline("none")).toBe(true);
    expect(canBuyOnline("expired")).toBe(true);
    expect(canBuyOnline("paused")).toBe(true);
  });

  it("says why in the words shown under the heading", () => {
    expect(ACTIVE_MEMBERSHIP_NOTICE).toBe("You already have an active membership, so you don't need a day pass.");
  });
});

describe("purchaseWarnings", () => {
  const none = { membershipStatus: "none", hasDayPass: false } as const;

  it("has nothing to say to someone buying their first membership", () => {
    expect(purchaseWarnings("MEMBERSHIP", none)).toEqual([]);
    expect(purchaseWarnings("PUNCH", none)).toEqual([]);
  });

  it("says a new membership starts when a paused one ends", () => {
    const warnings = purchaseWarnings("MEMBERSHIP", {
      membershipStatus: "paused",
      coveredUntil: "2026-11-30",
      hasDayPass: false,
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Nov 30, 2026");
  });

  it("says nothing about an expired membership, which a new one replaces", () => {
    expect(
      purchaseWarnings("MEMBERSHIP", { membershipStatus: "expired", coveredUntil: "2026-09-01", hasDayPass: false }),
    ).toEqual([]);
  });

  it("warns a day pass holder off a second", () => {
    expect(purchaseWarnings("DAY", { membershipStatus: "none", hasDayPass: true })[0]).toContain(
      "day pass for today",
    );
  });
});
