import { describe, expect, it } from "vitest";
import {
  addToCart,
  cartWarnings,
  checkCart,
  formatMoney,
  formatRate,
  priceCart,
  setQuantity,
  taxOn,
} from "./cart";
import type { PosClimber, Product } from "./types";

const product = (id: string, kind: Product["kind"], priceCents: number): Product => ({
  id,
  name: id,
  kind,
  priceCents,
  punches: kind === "PUNCH" ? 10 : null,
  durationMonths: kind === "MEMBERSHIP" ? 1 : null,
  recurring: false,
  chargesPst: kind === "RENTAL" || kind === "RETAIL",
});

const BC = { gstRateBps: 500, pstRateBps: 700 };

const day = product("day", "DAY", 2500);
const punch = product("punch", "PUNCH", 20000);
const month = product("month", "MEMBERSHIP", 10000);
const year = product("year", "MEMBERSHIP", 90000);
const shoes = product("shoes", "RENTAL", 600);
const chalk = product("chalk", "RETAIL", 800);
const products = [day, punch, month, year, shoes, chalk];

const climber: PosClimber = {
  id: "c1",
  name: "Kim Lee",
  phone: "",
  waiverStatus: "valid",
  membershipStatus: "none",
  hasDayPass: false,
  punchesLeft: 0,
};

describe("addToCart", () => {
  it("adds one, then counts up rentals and chalk", () => {
    let cart = addToCart([], shoes, products);
    cart = addToCart(cart, shoes, products);
    expect(cart).toEqual([{ productId: "shoes", quantity: 2 }]);
  });

  it("keeps a pass at one", () => {
    const cart = addToCart(addToCart([], day, products), day, products);
    expect(cart).toEqual([{ productId: "day", quantity: 1 }]);
  });

  it("replaces one membership with another", () => {
    let cart = addToCart([], shoes, products);
    cart = addToCart(cart, month, products);
    cart = addToCart(cart, year, products);
    expect(cart).toEqual([
      { productId: "shoes", quantity: 1 },
      { productId: "year", quantity: 1 },
    ]);
  });
});

describe("setQuantity", () => {
  it("removes at zero and caps at 20", () => {
    const cart = [{ productId: "chalk", quantity: 1 }];
    expect(setQuantity(cart, chalk, 0)).toEqual([]);
    expect(setQuantity(cart, chalk, 50)).toEqual([{ productId: "chalk", quantity: 20 }]);
  });

  it("keeps a pass at one", () => {
    expect(setQuantity([{ productId: "punch", quantity: 1 }], punch, 3)).toEqual([
      { productId: "punch", quantity: 1 },
    ]);
  });
});

describe("priceCart", () => {
  it("adds GST on the subtotal and PST only on rentals and goods", () => {
    const cart = [
      { productId: "day", quantity: 1 },
      { productId: "shoes", quantity: 1 },
    ];
    const priced = priceCart(cart, products, BC);
    expect(priced.subtotalCents).toBe(3100);
    expect(priced.gstCents).toBe(155); // 5% of 31.00
    expect(priced.pstCents).toBe(42); // 7% of the 6.00 rental
    expect(priced.totalCents).toBe(3297);
    expect(priced.lines.map((l) => l.lineTotalCents)).toEqual([2500, 600]);
  });

  it("charges no PST on passes and memberships", () => {
    const priced = priceCart([{ productId: "month", quantity: 1 }], products, BC);
    expect(priced).toMatchObject({ gstCents: 500, pstCents: 0, totalCents: 10500 });
  });

  it("rounds each tax once, on its own total", () => {
    // 3 × 8.00 = 24.00: GST 1.20, PST 1.68.
    const priced = priceCart([{ productId: "chalk", quantity: 3 }], products, BC);
    expect(priced.subtotalCents).toBe(2400);
    expect(priced.totalCents).toBe(2688);
  });

  it("leaves PST out when the gym's rate is 0", () => {
    const priced = priceCart([{ productId: "chalk", quantity: 1 }], products, { gstRateBps: 500, pstRateBps: 0 });
    expect(priced).toMatchObject({ pstCents: 0, totalCents: 840 });
  });

  it("is zero for an empty cart", () => {
    expect(priceCart([], products, BC)).toMatchObject({ subtotalCents: 0, gstCents: 0, pstCents: 0, totalCents: 0 });
  });
});

describe("taxOn", () => {
  it("rounds to the nearest cent", () => {
    expect(taxOn(10, 500)).toBe(1); // 0.5 cents rounds up
    expect(taxOn(9, 500)).toBe(0);
    expect(taxOn(90000, 500)).toBe(4500);
  });
});

describe("checkCart", () => {
  it("accepts a normal cart", () => {
    expect(checkCart([{ productId: "month", quantity: 1 }, { productId: "chalk", quantity: 2 }], products)).toBeNull();
  });

  it("refuses an empty cart, unknown products and two memberships", () => {
    expect(checkCart([], products)).toMatch(/empty/);
    expect(checkCart([{ productId: "gone", quantity: 1 }], products)).toMatch(/no longer for sale/);
    expect(
      checkCart(
        [
          { productId: "month", quantity: 1 },
          { productId: "year", quantity: 1 },
        ],
        products,
      ),
    ).toMatch(/one membership/);
  });

  it("refuses odd quantities", () => {
    expect(checkCart([{ productId: "day", quantity: 2 }], products)).toMatch(/quantity/);
    expect(checkCart([{ productId: "chalk", quantity: 0 }], products)).toMatch(/quantity/);
    expect(checkCart([{ productId: "chalk", quantity: 1.5 }], products)).toMatch(/quantity/);
    expect(checkCart([{ productId: "chalk", quantity: 21 }], products)).toMatch(/quantity/);
  });

  it("refuses the same product twice", () => {
    expect(
      checkCart(
        [
          { productId: "chalk", quantity: 1 },
          { productId: "chalk", quantity: 1 },
        ],
        products,
      ),
    ).toMatch(/twice/);
  });
});

describe("cartWarnings", () => {
  const priced = (ids: string[]) =>
    priceCart(
      ids.map((productId) => ({ productId, quantity: 1 })),
      products,
      BC,
    );

  it("warns about a missing or expired waiver, without blocking", () => {
    expect(cartWarnings({ ...climber, waiverStatus: "missing" }, priced(["day"]))[0]).toMatch(/No waiver/);
    expect(cartWarnings({ ...climber, waiverStatus: "expired" }, priced(["day"]))[0]).toMatch(/expired/);
    expect(cartWarnings(climber, priced(["day"]))).toEqual([]);
  });

  it("says when a new membership starts after the current one", () => {
    const member = { ...climber, membershipStatus: "active" as const, membershipRenewsOn: "2026-11-14" };
    expect(cartWarnings(member, priced(["month"]))).toEqual([
      "Their membership runs until Nov 14, 2026. The new one starts then.",
    ]);
  });

  it("points out a day pass they don't need", () => {
    expect(cartWarnings({ ...climber, membershipStatus: "active" }, priced(["day"]))[0]).toMatch(
      /active membership/,
    );
    expect(cartWarnings({ ...climber, hasDayPass: true }, priced(["day"]))[0]).toMatch(/already have a day pass/);
  });
});

describe("formatting", () => {
  it("shows dollars and the tax rate", () => {
    expect(formatMoney(3255)).toBe("$32.55");
    expect(formatMoney(90000)).toBe("$900.00");
    expect(formatRate(500)).toBe("5%");
  });
});
