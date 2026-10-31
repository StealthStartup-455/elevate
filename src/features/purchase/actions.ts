"use server";

import { getSessionClimberId } from "@/features/auth/queries";
import { isDemoMode } from "@/features/auth/demo-mode";
import { getClimber } from "@/features/climbers/queries";
import { isPass } from "@/features/pos/cart";
import { saveSale, type SaleResult } from "@/features/pos/sale";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/log";
import { ACTIVE_MEMBERSHIP_NOTICE, canBuyOnline, ONE_PASS_NOTICE } from "./catalog";
import { getMyGym } from "./queries";

// Server actions are public POST endpoints. This one takes the climber from
// the session, never from the request, so nobody can buy for another climber.
// Price, tax and passes are worked out again from the database in saveSale,
// in the climber's own gym (#34), never a gym named by the request.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** More lines than the Purchase tab has products; keeps a made-up request small. */
const MAX_LINES = 20;

export type BuyItem = {
  productId: string;
  /** Rentals and chalk only; a pass or membership is always one. Default 1. */
  quantity?: number;
};

export type BuyInput = {
  /** One order: any rentals and chalk, and at most one membership or pass. */
  items: BuyItem[];
  /** Made by the checkout popup. The same key twice saves one purchase. */
  idempotencyKey: string;
};

/**
 * The signed-in climber buys an order: any number of rentals and chalk (up to
 * 20 of each) and at most one membership, day pass or punch card (#143). A
 * mock checkout: nothing is charged, and the sale is recorded as ONLINE so the
 * desk can tell it from card and cash. Real payments are #31. Because it gives
 * the pass without taking any money, it is refused outside demo mode (#45).
 */
export async function buyOnline(input: BuyInput): Promise<SaleResult> {
  const refuse = (reason: string, message: string): SaleResult => {
    logEvent("sale_refused", { reason, source: "online" });
    return { ok: false, message };
  };

  if (!isDemoMode()) {
    return refuse("not_demo", "Buying in the app isn't open yet. Ask at the front desk.");
  }
  const climberId = await getSessionClimberId();
  if (!climberId) return refuse("not_signed_in", "Log in to buy a membership.");
  if (
    typeof input !== "object" ||
    input === null ||
    !UUID.test(String(input.idempotencyKey)) ||
    !Array.isArray(input.items) ||
    input.items.length === 0 ||
    input.items.length > MAX_LINES ||
    input.items.some(
      (i) =>
        typeof i !== "object" ||
        i === null ||
        !UUID.test(String(i.productId)) ||
        (i.quantity !== undefined && typeof i.quantity !== "number"),
    )
  ) {
    return refuse("invalid_input", "Something went wrong. Start again.");
  }
  const items = input.items.map((i) => ({ productId: i.productId, quantity: i.quantity ?? 1 }));
  const ids = items.map((i) => i.productId);
  if (new Set(ids).size !== ids.length) {
    return refuse("invalid_input", "The order lists the same item twice. Start again.");
  }

  const climber = await getClimber(climberId);
  if (!climber) return refuse("climber_not_found", "Climber not found.");

  const gym = await getMyGym();
  if (!gym) return refuse("no_gym", "Log in to buy.");
  const products = await db.product.findMany({
    where: { id: { in: ids }, gymId: gym.id, active: true },
    select: { kind: true },
  });
  if (products.length !== ids.length) {
    return refuse("not_for_sale", "Something in your order isn't for sale any more. Remove it and try again.");
  }
  // The pass options aren't shown to an active member; this keeps a hand-made
  // request out too. Rentals and chalk stay open to them.
  if (products.some((p) => !canBuyOnline(climber.membershipStatus, p.kind))) {
    return refuse("active_membership", ACTIVE_MEMBERSHIP_NOTICE);
  }
  // At most one membership or pass in an order, so someone can't stock up on
  // several in one go. The desk may sell one of each (checkCart); the app one in all.
  if (products.filter((p) => isPass(p.kind)).length > 1) {
    return refuse("one_pass", ONE_PASS_NOTICE);
  }

  // saveSale (checkCart) holds the line on the quantities: one for a pass,
  // 1 to 20 for rentals and chalk.
  return saveSale(
    { climberId, items, tender: "ONLINE", idempotencyKey: input.idempotencyKey },
    { gym, staffId: null },
  );
}
