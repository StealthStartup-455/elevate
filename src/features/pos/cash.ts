// Paying in cash. Canada has no pennies, so a cash total is rounded to the
// nearest 5 cents: 1, 2, 6 and 7 cents round down, 3, 4, 8 and 9 round up.
// Card and online payments are charged to the cent and never rounded.

/** The amount to take in cash for a total, rounded to the nearest 5 cents. */
export function roundCash(cents: number): number {
  return Math.round(cents / 5) * 5;
}

/** How much the cash rounding moved a total: −2 for 17.92 → 17.90. */
export function cashRounding(cents: number): number {
  return roundCash(cents) - cents;
}

/** Bills offered as one-press amounts for the cash received. */
export const QUICK_BILLS_CENTS = [2000, 5000, 10000] as const;

/** The bills worth offering for a cash total: only the ones that cover it. */
export function quickBills(dueCents: number): number[] {
  return QUICK_BILLS_CENTS.filter((bill) => bill > dueCents);
}

export type CashTendered =
  | { status: "empty" }
  | { status: "invalid" }
  | { status: "short"; shortCents: number }
  | { status: "paid"; changeCents: number };

/**
 * Compares the cash handed over (null when it isn't an amount) with what is
 * owed in cash. "paid" carries the change to give back.
 */
export function cashTendered(text: string, receivedCents: number | null, dueCents: number): CashTendered {
  if (text.trim() === "") return { status: "empty" };
  if (receivedCents === null) return { status: "invalid" };
  if (receivedCents < dueCents) return { status: "short", shortCents: dueCents - receivedCents };
  return { status: "paid", changeCents: receivedCents - dueCents };
}
