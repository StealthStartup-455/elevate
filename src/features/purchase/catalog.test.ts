import { describe, expect, it } from "vitest";
import { ACTIVE_MEMBERSHIP_NOTICE, canBuyOnline, purchaseWarnings, showsMembershipSection } from "./catalog";

describe("canBuyOnline", () => {
  it("shuts an active member out of passes and memberships only", () => {
    for (const kind of ["MEMBERSHIP", "DAY", "PUNCH"] as const) {
      expect(canBuyOnline("active", kind)).toBe(false);
    }
    expect(canBuyOnline("active", "RENTAL")).toBe(true);
    expect(canBuyOnline("active", "RETAIL")).toBe(true);
  });

  it("lets everyone else buy anything", () => {
    for (const status of ["none", "expired", "paused"] as const) {
      for (const kind of ["MEMBERSHIP", "DAY", "PUNCH", "RENTAL", "RETAIL"] as const) {
        expect(canBuyOnline(status, kind)).toBe(true);
      }
    }
  });

  it("says why in the words shown to an active member", () => {
    expect(ACTIVE_MEMBERSHIP_NOTICE).toBe("You already have an active membership, so you don't need a day pass.");
  });
});

describe("showsMembershipSection", () => {
  it("is for climbers without an active membership", () => {
    expect(showsMembershipSection("none")).toBe(true);
    expect(showsMembershipSection("expired")).toBe(true);
    expect(showsMembershipSection("paused")).toBe(true);
    expect(showsMembershipSection("active")).toBe(false);
  });
});

describe("purchaseWarnings", () => {
  const none = { membershipStatus: "none", hasDayPass: false } as const;

  it("has nothing to say to someone buying their first membership or a rental", () => {
    expect(purchaseWarnings("MEMBERSHIP", none)).toEqual([]);
    expect(purchaseWarnings("PUNCH", none)).toEqual([]);
    expect(purchaseWarnings("RENTAL", none)).toEqual([]);
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
