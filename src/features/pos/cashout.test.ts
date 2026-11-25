import { describe, expect, it } from "vitest";
import { cashOutSummary, parseDollars, takenCents } from "./cashout";
import type { SaleSummary } from "./types";

let n = 0;
const sale = (
  tender: SaleSummary["tender"],
  subtotalCents: number,
  gstCents: number,
  pstCents: number,
  status: SaleSummary["status"] = "PAID",
): SaleSummary => ({
  id: `sale-${++n}`,
  climberId: "c1",
  climberName: "Nevin Gill",
  time: "4:12 p.m.",
  items: "Day pass",
  subtotalCents,
  gstCents,
  pstCents,
  totalCents: subtotalCents + gstCents + pstCents,
  tender,
  status,
});

describe("cashOutSummary", () => {
  it("adds up paid sales by payment type, with taxes", () => {
    const summary = cashOutSummary([
      sale("CARD", 2500, 125, 0),
      sale("CARD", 1000, 50, 70),
      sale("CASH", 3500, 175, 0),
      sale("ONLINE", 10000, 500, 0),
    ]);

    expect(summary.byTender).toEqual([
      { tender: "CARD", count: 2, subtotalCents: 3500, gstCents: 175, pstCents: 70, totalCents: 3745, roundingCents: 0 },
      { tender: "CASH", count: 1, subtotalCents: 3500, gstCents: 175, pstCents: 0, totalCents: 3675, roundingCents: 0 },
      {
        tender: "ONLINE",
        count: 1,
        subtotalCents: 10000,
        gstCents: 500,
        pstCents: 0,
        totalCents: 10500,
        roundingCents: 0,
      },
    ]);
    expect(summary.paid).toEqual({
      count: 4,
      subtotalCents: 17000,
      gstCents: 850,
      pstCents: 70,
      totalCents: 17920,
      roundingCents: 0,
    });
  });

  it("rounds each cash sale to 5 cents but never card sales", () => {
    const summary = cashOutSummary([
      // 17.92 → 17.90 and 39.69 → 39.70 in cash: 57.60 in the till, rounding −0.01.
      sale("CASH", 1707, 85, 0),
      sale("CASH", 3700, 185, 84),
      // 17.92 on card stays 17.92.
      sale("CARD", 1707, 85, 0),
    ]);
    expect(summary.byTender[1]).toMatchObject({ tender: "CASH", count: 2, totalCents: 5760, roundingCents: -1 });
    expect(summary.byTender[0]).toMatchObject({ tender: "CARD", totalCents: 1792, roundingCents: 0 });
    expect(summary.paid).toMatchObject({ totalCents: 7552, roundingCents: -1 });
  });

  it("leaves voided sales out of the totals but counts them", () => {
    const summary = cashOutSummary([sale("CASH", 2500, 125, 0), sale("CASH", 1000, 50, 0, "VOIDED")]);
    expect(summary.byTender[1]).toMatchObject({ tender: "CASH", count: 1, totalCents: 2625 });
    expect(summary.paid.totalCents).toBe(2625);
    expect(summary.voided).toEqual({ count: 1, totalCents: 1050 });
  });

  it("shows every payment type at zero on a day with no sales", () => {
    const summary = cashOutSummary([]);
    expect(summary.byTender.map((t) => [t.tender, t.count, t.totalCents])).toEqual([
      ["CARD", 0, 0],
      ["CASH", 0, 0],
      ["ONLINE", 0, 0],
    ]);
    expect(summary.voided).toEqual({ count: 0, totalCents: 0 });
  });
});

describe("takenCents", () => {
  it("is the rounded amount for cash and the exact total for card", () => {
    expect(takenCents(sale("CASH", 1707, 85, 0))).toBe(1790);
    expect(takenCents(sale("CARD", 1707, 85, 0))).toBe(1792);
  });

  it("refunds a voided cash sale at what was collected", () => {
    expect(cashOutSummary([sale("CASH", 1707, 85, 0, "VOIDED")]).voided).toEqual({ count: 1, totalCents: 1790 });
  });
});

describe("parseDollars", () => {
  it("reads what staff type for counted cash", () => {
    expect(parseDollars("412.50")).toBe(41250);
    expect(parseDollars("$412")).toBe(41200);
    expect(parseDollars(" 1,200.5 ")).toBe(120050);
    expect(parseDollars("0")).toBe(0);
  });

  it("is null for anything that isn't money", () => {
    expect(parseDollars("")).toBeNull();
    expect(parseDollars("abc")).toBeNull();
    expect(parseDollars("-5")).toBeNull();
    expect(parseDollars("1.234")).toBeNull();
  });
});
