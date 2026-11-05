import type { SaleSummary, Tender } from "./types";

export type CashOutTotals = {
  count: number;
  subtotalCents: number;
  gstCents: number;
  pstCents: number;
  totalCents: number;
};

export type CashOutSummary = {
  /** Paid sales by payment type, always Card, Cash, Online in that order. */
  byTender: (CashOutTotals & { tender: Tender })[];
  /** Every paid sale together. */
  paid: CashOutTotals;
  /** Voided sales: not in any total above, listed so the count can be checked. */
  voided: { count: number; totalCents: number };
};

export const TENDER_LABEL = { CARD: "Card", CASH: "Cash", ONLINE: "Online" } as const;

export const TENDERS = ["CARD", "CASH", "ONLINE"] as const satisfies readonly Tender[];

function add(sales: SaleSummary[]): CashOutTotals {
  return sales.reduce(
    (t, s) => ({
      count: t.count + 1,
      subtotalCents: t.subtotalCents + s.subtotalCents,
      gstCents: t.gstCents + s.gstCents,
      pstCents: t.pstCents + s.pstCents,
      totalCents: t.totalCents + s.totalCents,
    }),
    { count: 0, subtotalCents: 0, gstCents: 0, pstCents: 0, totalCents: 0 },
  );
}

/**
 * The end of day cash out: paid sales added up by payment type, with
 * subtotal, GST and PST, so staff can match the card machine's batch and
 * count the till. Voided sales are left out of every total.
 */
export function cashOutSummary(sales: SaleSummary[]): CashOutSummary {
  const paid = sales.filter((s) => s.status === "PAID");
  const voided = sales.filter((s) => s.status === "VOIDED");
  return {
    byTender: TENDERS.map((tender) => ({ tender, ...add(paid.filter((s) => s.tender === tender)) })),
    paid: add(paid),
    voided: { count: voided.length, totalCents: voided.reduce((sum, s) => sum + s.totalCents, 0) },
  };
}

/**
 * Dollars typed by staff ("412.50", "$412", "1,200") to cents. Null when it
 * isn't an amount of money.
 */
export function parseDollars(text: string): number | null {
  const cleaned = text.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}
