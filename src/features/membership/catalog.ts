// What a climber can buy for themselves, and what to tell them first. Pure,
// so it can be checked without a database.
import { formatDate } from "@/features/climbers/format";
import type { MembershipStatus } from "@/features/climbers/types";
import type { ProductKind } from "@/features/pos/types";

// Passes only. Shoe rental and chalk are handed over at the desk, so they
// aren't offered in the app.
const SOLD_ONLINE: ReadonlySet<ProductKind> = new Set(["DAY", "PUNCH", "MEMBERSHIP"]);

export function isSoldOnline(kind: ProductKind): boolean {
  return SOLD_ONLINE.has(kind);
}

export type PurchaseContext = {
  membershipStatus: MembershipStatus;
  /** ISO date the last membership they have (or have queued) ends. */
  coveredUntil?: string;
  hasDayPass: boolean;
};

/**
 * Things worth knowing before paying. None of them stop the purchase: someone
 * can renew early, or buy a day pass they turn out not to need.
 */
export function purchaseWarnings(kind: ProductKind, ctx: PurchaseContext): string[] {
  const warnings: string[] = [];
  const hasMembership = ctx.membershipStatus === "active" || ctx.membershipStatus === "paused";
  if (kind === "MEMBERSHIP" && hasMembership && ctx.coveredUntil) {
    warnings.push(
      `Your membership runs until ${formatDate(ctx.coveredUntil, true)}. The new one starts then, so you don't lose any days.`,
    );
  }
  if (kind === "DAY" && ctx.membershipStatus === "active") {
    warnings.push("You already have an active membership, so you don't need a day pass.");
  } else if (kind === "DAY" && ctx.hasDayPass) {
    warnings.push("You already have a day pass for today.");
  }
  return warnings;
}
