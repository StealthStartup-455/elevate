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

/** Bills with a button that adds them to the cash received. */
export const QUICK_BILLS_CENTS = [500, 2000, 5000, 10000] as const;

/** The cash received after one more bill: a $20 then a $5 is 25.00. Not an amount yet counts as nothing. */
export function addBill(receivedCents: number | null, billCents: number): string {
  return (((receivedCents ?? 0) + billCents) / 100).toFixed(2);
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
