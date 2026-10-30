// The POS cart and its totals. Pure, so the cart on screen, the checkout
// popup and the saved sale all use the same sums, and it can be checked
// without a database. Money is whole cents throughout.
import { formatDate } from "@/features/climbers/format";
import type { CartItem, PosClimber, PricedCart, Product, ProductKind, TaxRates } from "./types";

// Passes get someone in, so one of each per sale is enough. Rentals and chalk
// can be bought several at a time.
const PASS_KINDS: ReadonlySet<ProductKind> = new Set(["DAY", "PUNCH", "MEMBERSHIP"]);
export const MAX_QUANTITY = 20;

export function isPass(kind: ProductKind): boolean {
  return PASS_KINDS.has(kind);
}

/**
 * Adds one of `product`. A pass already in the cart stays at one, and a
 * membership replaces any other membership: a climber buys one at a time.
 */
export function addToCart(cart: CartItem[], product: Product, products: Product[]): CartItem[] {
  const existing = cart.find((i) => i.productId === product.id);
  if (existing) {
    if (isPass(product.kind)) return cart;
    return setQuantity(cart, product, existing.quantity + 1);
  }
  const kindOf = new Map(products.map((p) => [p.id, p.kind]));
  const kept =
    product.kind === "MEMBERSHIP"
      ? cart.filter((i) => kindOf.get(i.productId) !== "MEMBERSHIP")
      : cart;
  return [...kept, { productId: product.id, quantity: 1 }];
}

/** Sets how many of `product`; 0 removes it. Passes stay at one. */
export function setQuantity(cart: CartItem[], product: Product, quantity: number): CartItem[] {
  if (quantity <= 0) return cart.filter((i) => i.productId !== product.id);
  const q = isPass(product.kind) ? 1 : Math.min(Math.floor(quantity), MAX_QUANTITY);
  return cart.map((i) => (i.productId === product.id ? { ...i, quantity: q } : i));
}

/** Tax on an amount, rounded once to the cent. */
export function taxOn(amountCents: number, rateBps: number): number {
  return Math.round((amountCents * rateBps) / 10_000);
}

/**
 * Lines, subtotal, taxes and total. GST is on the whole subtotal; PST only
 * on the lines that charge it (rentals and chalk in BC). Each tax is rounded
 * once. Items whose product isn't in `products` are left out (the server
 * refuses them first, see checkCart).
 */
export function priceCart(cart: CartItem[], products: Product[], rates: TaxRates): PricedCart {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = cart.flatMap((item) => {
    const p = byId.get(item.productId);
    if (!p) return [];
    return [
      {
        productId: p.id,
        name: p.name,
        kind: p.kind,
        unitPriceCents: p.priceCents,
        quantity: item.quantity,
        lineTotalCents: p.priceCents * item.quantity,
        chargesPst: p.chargesPst,
      },
    ];
  });
  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const pstableCents = lines.reduce((sum, l) => sum + (l.chargesPst ? l.lineTotalCents : 0), 0);
  const gstCents = taxOn(subtotalCents, rates.gstRateBps);
  const pstCents = taxOn(pstableCents, rates.pstRateBps);
  return {
    lines,
    subtotalCents,
    gstRateBps: rates.gstRateBps,
    gstCents,
    pstRateBps: rates.pstRateBps,
    pstCents,
    totalCents: subtotalCents + gstCents + pstCents,
  };
}

/**
 * Why the server won't save this cart, or null when it's fine. The browser
 * keeps to these rules already; this catches a tampered or stale request.
 */
export function checkCart(cart: CartItem[], products: Product[]): string | null {
  if (cart.length === 0) return "The cart is empty.";
  const byId = new Map(products.map((p) => [p.id, p]));
  const seen = new Set<string>();
  let memberships = 0;
  for (const item of cart) {
    const p = byId.get(item.productId);
    if (!p) return "Something in the cart is no longer for sale. Remove it and try again.";
    if (seen.has(p.id)) return "The cart lists the same item twice.";
    seen.add(p.id);
    const max = isPass(p.kind) ? 1 : MAX_QUANTITY;
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > max) {
      return `Check the quantity of ${p.name}.`;
    }
    if (p.kind === "MEMBERSHIP") memberships++;
  }
  if (memberships > 1) return "Only one membership per sale.";
  return null;
}

/**
 * Things the desk should know before taking the money. None of them stop the
 * sale: a climber can buy a pass before signing the waiver.
 */
export function cartWarnings(climber: PosClimber, cart: PricedCart): string[] {
  const warnings: string[] = [];
  if (climber.waiverStatus === "missing") {
    warnings.push("No waiver on file. They need to sign one before climbing.");
  } else if (climber.waiverStatus === "expired") {
    warnings.push("Waiver expired. They need to sign a new one before climbing.");
  }
  const kinds = new Set(cart.lines.map((l) => l.kind));
  const hasMembership = climber.membershipStatus === "active" || climber.membershipStatus === "paused";
  if (kinds.has("MEMBERSHIP") && hasMembership && climber.membershipRenewsOn) {
    warnings.push(
      `Their membership runs until ${formatDate(climber.membershipRenewsOn, true)}. The new one starts then.`,
    );
  }
  if (kinds.has("DAY") && climber.membershipStatus === "active") {
    warnings.push("They already have an active membership, so they don't need a day pass.");
  } else if (kinds.has("DAY") && climber.hasDayPass) {
    warnings.push("They already have a day pass for today.");
  }
  return warnings;
}

const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

/** "$25.00". */
export function formatMoney(cents: number): string {
  return money.format(cents / 100);
}

/** 500 → "5%", 1250 → "12.5%". */
export function formatRate(bps: number): string {
  return `${bps / 100}%`;
}
