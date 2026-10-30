"use server";

import { getSessionClimberId } from "@/features/auth/queries";
import { saveSale, type SaleResult } from "@/features/pos/sale";
import { db } from "@/lib/db";
import { getGym } from "@/lib/gym";
import { logEvent } from "@/lib/log";
import { isSoldOnline } from "./catalog";

// Server actions are public POST endpoints. This one takes the climber from
// the session, never from the request, so nobody can buy for another climber.
// Price, tax and passes are worked out again from the database in saveSale.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BuyInput = {
  productId: string;
  /** Made by the checkout popup. The same key twice saves one purchase. */
  idempotencyKey: string;
};

/**
 * The signed-in climber buys one pass or membership. A mock checkout: nothing
 * is charged, and the sale is recorded as ONLINE so the desk can tell it from
 * card and cash. Real payments are #31.
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
    !UUID.test(String(input.idempotencyKey))
  ) {
    return refuse("invalid_input", "Something went wrong. Start again.");
  }

  // Rentals and chalk are desk items. saveSale would sell them, so check here.
  const gym = await getGym();
  const product = await db.product.findFirst({
    where: { id: input.productId, gymId: gym.id, active: true },
    select: { kind: true },
  });
  if (!product || !isSoldOnline(product.kind)) {
    return refuse("not_for_sale", "That isn't for sale in the app any more. Pick another.");
  }

  return saveSale({
    climberId,
    items: [{ productId: input.productId, quantity: 1 }],
    tender: "ONLINE",
    idempotencyKey: input.idempotencyKey,
  });
}
