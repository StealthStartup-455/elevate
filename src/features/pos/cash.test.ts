import { describe, expect, it } from "vitest";
import { cashRounding, cashTendered, quickBills, roundCash } from "./cash";

describe("roundCash", () => {
  it("rounds to the nearest 5 cents the Canadian way", () => {
    // Ends in 1, 2, 6 or 7: down. Ends in 3, 4, 8 or 9: up. 0 and 5 stay.
    expect([1790, 1791, 1792, 1793, 1794, 1795, 1796, 1797, 1798, 1799].map(roundCash)).toEqual([
      1790, 1790, 1790, 1795, 1795, 1795, 1795, 1795, 1800, 1800,
    ]);
  });

  it("keeps zero at zero", () => {
    expect(roundCash(0)).toBe(0);
  });
});

describe("cashRounding", () => {
  it("is how far the rounding moved the total", () => {
    expect(cashRounding(1792)).toBe(-2);
    expect(cashRounding(3969)).toBe(1);
    expect(cashRounding(1795)).toBe(0);
  });
});

describe("quickBills", () => {
  it("offers only the bills that cover the total", () => {
    expect(quickBills(1790)).toEqual([2000, 5000, 10000]);
    expect(quickBills(3970)).toEqual([5000, 10000]);
    expect(quickBills(10000)).toEqual([]);
  });
});

describe("cashTendered", () => {
  it("gives the change from a $20 on a $17.92 sale", () => {
    expect(cashTendered("20", 2000, roundCash(1792))).toEqual({ status: "paid", changeCents: 210 });
  });

  it("is paid with no change for the exact amount", () => {
    expect(cashTendered("17.90", 1790, 1790)).toEqual({ status: "paid", changeCents: 0 });
  });

  it("says how much is still owed when it's short", () => {
    expect(cashTendered("10", 1000, 1790)).toEqual({ status: "short", shortCents: 790 });
  });

  it("tells an empty box from one that isn't money", () => {
    expect(cashTendered("  ", null, 1790)).toEqual({ status: "empty" });
    expect(cashTendered("abc", null, 1790)).toEqual({ status: "invalid" });
  });
});
