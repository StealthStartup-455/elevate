// What a climber can buy for themselves, and what to tell them first. Pure,
// so it can be checked without a database.
import { formatDate } from "@/features/climbers/format";
import type { MembershipStatus } from "@/features/climbers/types";
import { isPass } from "@/features/pos/cart";
import type { ProductKind } from "@/features/pos/types";

/** Shown to an active member where the membership options would be, and the server's refusal. */
export const ACTIVE_MEMBERSHIP_NOTICE =
  "You already have an active membership, so you don't need a day pass.";

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
