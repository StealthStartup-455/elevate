"use server";

import { getSessionClimberId } from "@/features/auth/queries";
import { getClimber } from "@/features/climbers/queries";
import { saveSale, type SaleResult } from "@/features/pos/sale";
import { db } from "@/lib/db";
import { getGym } from "@/lib/gym";
import { logEvent } from "@/lib/log";
import { ACTIVE_MEMBERSHIP_NOTICE, canBuyOnline } from "./catalog";

// Server actions are public POST endpoints. This one takes the climber from
// the session, never from the request, so nobody can buy for another climber.
// Price, tax and passes are worked out again from the database in saveSale.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BuyInput = {
  productId: string;
  /** Rentals and chalk only; a pass or membership is always one. Default 1. */
  quantity?: number;
  /** Made by the checkout popup. The same key twice saves one purchase. */
  idempotencyKey: string;
};

/**
 * The signed-in climber buys one pass, membership, rental or chalk (rentals
 * and chalk up to 20 at a time). A mock checkout: nothing is charged, and the
 * sale is recorded as ONLINE so the desk can tell it from card and cash. Real
 * payments are #31.
 */
export async function buyOnline(input: BuyInput): Promise<SaleResult> {
  const refuse = (reason: string, message: string): SaleResult => {
    logEvent("sale_refused", { reason, source: "online" });
    return { ok: false, message };
  };

  const climberId = await getSessionClimberId();
  if (!climberId) return refuse("not_signed_in", "Log in to buy a membership.");
  if (
    typeof input !== "object" ||
    input === null ||
    !UUID.test(String(input.productId)) ||
    !UUID.test(String(input.idempotencyKey)) ||
    (input.quantity !== undefined && typeof input.quantity !== "number")
  ) {
    return refuse("invalid_input", "Something went wrong. Start again.");
  }

  const climber = await getClimber(climberId);
  if (!climber) return refuse("climber_not_found", "Climber not found.");

  const gym = await getGym();
  const product = await db.product.findFirst({
    where: { id: input.productId, gymId: gym.id, active: true },
    select: { kind: true },
  });
  if (!product) {
    return refuse("not_for_sale", "That isn't for sale any more. Pick another.");
  }
  // The pass options aren't shown to an active member; this keeps a hand-made
  // request out too. Rentals and chalk stay open to them.
  if (!canBuyOnline(climber.membershipStatus, product.kind)) {
    return refuse("active_membership", ACTIVE_MEMBERSHIP_NOTICE);
  }

  // saveSale (checkCart) holds the line on the quantity: one for a pass,
  // 1 to 20 for rentals and chalk.
  return saveSale({
    climberId,
    items: [{ productId: input.productId, quantity: input.quantity ?? 1 }],
    tender: "ONLINE",
    idempotencyKey: input.idempotencyKey,
  });
}
