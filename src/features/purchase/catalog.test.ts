import { describe, expect, it } from "vitest";
import type { Product } from "@/features/pos/types";
import {
  ACTIVE_MEMBERSHIP_NOTICE,
  canBuyOnline,
  choosePass,
  purchaseWarnings,
  setGoodsQuantity,
  showsMembershipSection,
} from "./catalog";

const product = (id: string, kind: Product["kind"]): Product => ({
  id,
  name: id,
  kind,
  priceCents: 1000,
  punches: null,
  durationMonths: null,
  recurring: false,
  chargesPst: false,
});
const month = product("month", "MEMBERSHIP");
const day = product("day", "DAY");
const punch = product("punch", "PUNCH");
const shoes = product("shoes", "RENTAL");
const chalk = product("chalk", "RETAIL");
const all = [month, day, punch, shoes, chalk];

describe("choosePass", () => {
  it("replaces the membership or pass already in the order, and keeps the goods", () => {
    const withGoods = [{ productId: "shoes", quantity: 2 }];
    const first = choosePass(withGoods, month, all);
    expect(first).toEqual([{ productId: "shoes", quantity: 2 }, { productId: "month", quantity: 1 }]);
    const second = choosePass(first, day, all);
    expect(second).toEqual([{ productId: "shoes", quantity: 2 }, { productId: "day", quantity: 1 }]);
    // A day pass and a punch card are passes too: still only one.
    expect(choosePass(second, punch, all).map((i) => i.productId)).toEqual(["shoes", "punch"]);
  });

  it("takes the pass out when it is picked again", () => {
    const cart = [{ productId: "month", quantity: 1 }, { productId: "chalk", quantity: 1 }];
    expect(choosePass(cart, month, all)).toEqual([{ productId: "chalk", quantity: 1 }]);
  });
});

describe("setGoodsQuantity", () => {
  it("adds, changes and removes rentals and chalk, up to 20", () => {
    let cart = setGoodsQuantity([], shoes, 2);
    cart = setGoodsQuantity(cart, chalk, 3);
    expect(cart).toEqual([{ productId: "shoes", quantity: 2 }, { productId: "chalk", quantity: 3 }]);
    cart = setGoodsQuantity(cart, shoes, 25);
    expect(cart[0]).toEqual({ productId: "shoes", quantity: 20 });
    cart = setGoodsQuantity(cart, shoes, 0);
    expect(cart).toEqual([{ productId: "chalk", quantity: 3 }]);
    expect(setGoodsQuantity(cart, chalk, -1)).toEqual([]);
  });
});

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
