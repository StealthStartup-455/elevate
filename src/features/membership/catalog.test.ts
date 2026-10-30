import { describe, expect, it } from "vitest";
import { isSoldOnline, purchaseWarnings } from "./catalog";

describe("isSoldOnline", () => {
  it("offers passes and memberships, not rentals or chalk", () => {
    expect(isSoldOnline("DAY")).toBe(true);
    expect(isSoldOnline("PUNCH")).toBe(true);
    expect(isSoldOnline("MEMBERSHIP")).toBe(true);
    expect(isSoldOnline("RENTAL")).toBe(false);
    expect(isSoldOnline("RETAIL")).toBe(false);
  });
});

describe("purchaseWarnings", () => {
  const none = { membershipStatus: "none", hasDayPass: false } as const;

  it("has nothing to say to someone buying their first membership", () => {
    expect(purchaseWarnings("MEMBERSHIP", none)).toEqual([]);
    expect(purchaseWarnings("PUNCH", none)).toEqual([]);
  });

  it("says a new membership starts when the current one ends", () => {
    const warnings = purchaseWarnings("MEMBERSHIP", {
      membershipStatus: "active",
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

  it("warns a member off a day pass, and a day pass holder off a second", () => {
    expect(purchaseWarnings("DAY", { membershipStatus: "active", hasDayPass: false })[0]).toContain(
      "active membership",
    );
    expect(purchaseWarnings("DAY", { membershipStatus: "none", hasDayPass: true })[0]).toContain(
      "day pass for today",
    );
  });
});
