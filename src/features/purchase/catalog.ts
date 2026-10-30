// What a climber can buy for themselves, and what to tell them first. Pure,
// so it can be checked without a database.
import { formatDate } from "@/features/climbers/format";
import type { MembershipStatus } from "@/features/climbers/types";
import { isPass, MAX_QUANTITY } from "@/features/pos/cart";
import type { CartItem, Product, ProductKind } from "@/features/pos/types";

/** Shown to an active member where the membership options would be, and the server's refusal. */
export const ACTIVE_MEMBERSHIP_NOTICE =
  "You already have an active membership, so you don't need a day pass.";

/** The server's refusal of an order with two memberships or passes (#143). */
export const ONE_PASS_NOTICE = "An order can have one membership or pass. Buy the other one separately.";

/**
 * Picks a membership, day pass or punch card for the order. An order has at
 * most one of them, so picking another replaces it, and picking the same one
 * again takes it out. Rentals and chalk in the order stay as they are.
 */
export function choosePass(cart: CartItem[], product: Product, products: Product[]): CartItem[] {
  const kindOf = new Map(products.map((p) => [p.id, p.kind]));
  const others = cart.filter((i) => {
    const kind = kindOf.get(i.productId);
    return kind !== undefined && !isPass(kind);
  });
  const alreadyPicked = cart.some((i) => i.productId === product.id);
  return alreadyPicked ? others : [...others, { productId: product.id, quantity: 1 }];
}

/** Sets how many of a rental or chalk product are in the order, 0 to 20; 0 takes it out. */
export function setGoodsQuantity(cart: CartItem[], product: Product, quantity: number): CartItem[] {
  const q = Math.min(Math.max(Math.floor(quantity) || 0, 0), MAX_QUANTITY);
  if (q === 0) return cart.filter((i) => i.productId !== product.id);
  if (cart.some((i) => i.productId === product.id)) {
    return cart.map((i) => (i.productId === product.id ? { ...i, quantity: q } : i));
  }
  return [...cart, { productId: product.id, quantity: q }];
}

/**
 * Whether this climber can buy this kind of product in the app. An active
 * member has nothing to buy among the passes and memberships (day pass, punch
 * card, membership); rentals and chalk are for everyone, member or not.
 */
export function canBuyOnline(membershipStatus: MembershipStatus, kind: ProductKind): boolean {
  return !(isPass(kind) && membershipStatus === "active");
}

/** The Membership section is for climbers without an active membership. */
export function showsMembershipSection(membershipStatus: MembershipStatus): boolean {
  return membershipStatus !== "active";
}

export type PurchaseContext = {
  membershipStatus: MembershipStatus;
  /** ISO date the last membership they have (or have queued) ends. */
  coveredUntil?: string;
  hasDayPass: boolean;
};

/**
 * Things worth knowing before paying. None of them stop the purchase. An
 * active member can't buy a pass (see canBuyOnline), so these are for everyone
 * else: a paused membership, or a day pass already bought today.
 */
export function purchaseWarnings(kind: ProductKind, ctx: PurchaseContext): string[] {
  const warnings: string[] = [];
  const hasMembership = ctx.membershipStatus === "active" || ctx.membershipStatus === "paused";
  if (kind === "MEMBERSHIP" && hasMembership && ctx.coveredUntil) {
    warnings.push(
      `Your membership runs until ${formatDate(ctx.coveredUntil, true)}. The new one starts then, so you don't lose any days.`,
    );
  }
  if (kind === "DAY" && ctx.hasDayPass) {
    warnings.push("You already have a day pass for today.");
  }
  return warnings;
}
