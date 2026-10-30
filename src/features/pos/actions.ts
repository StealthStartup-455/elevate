"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/features/auth/staff";
import { formatDate } from "@/features/climbers/format";
import { getClimber } from "@/features/climbers/queries";
import { isoDay } from "@/features/climbers/status";
import { db } from "@/lib/db";
import { getGym } from "@/lib/gym";
import { logEvent } from "@/lib/log";
import { checkCart, priceCart } from "./cart";
import { membershipStartsAt, passFor, voidedExpiry } from "./passes";
import { sellsInElevate } from "./queries";
import type { CartItem, Tender } from "./types";

// Server actions are public POST endpoints, so each one checks for staff
// itself and trusts nothing from the browser: prices, totals and passes are
// worked out here again from the database.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TENDERS: readonly Tender[] = ["CARD", "CASH"];
const MAX_LINES = 30;

export type SaleInput = {
  climberId: string;
  items: CartItem[];
  tender: Tender;
  /** Made by the checkout popup. The same key twice saves one sale. */
  idempotencyKey: string;
};

export type SaleResult =
  | { ok: true; saleId: string; totalCents: number; tender: Tender; added: string[] }
  | { ok: false; message: string };

function refreshPosPages(climberId: string) {
  revalidatePath("/desk/pos");
  revalidatePath("/desk");
  revalidatePath("/me");
  revalidatePath(`/desk/climbers/${climberId}`);
}

// Only the shape; the cart rules (known products, quantities) are checkCart's.
function validInput(input: SaleInput): boolean {
  return (
    typeof input === "object" &&
    input !== null &&
    UUID.test(String(input.climberId)) &&
    UUID.test(String(input.idempotencyKey)) &&
    TENDERS.includes(input.tender) &&
    Array.isArray(input.items) &&
    input.items.length <= MAX_LINES &&
    input.items.every(
      (i) => typeof i === "object" && i !== null && UUID.test(String(i.productId)) && typeof i.quantity === "number",
    )
  );
}

// What the sale put on the climber's account, for the done screen.
async function describeSale(saleId: string, gymId: string): Promise<string[]> {
  const lines = await db.saleLine.findMany({
    where: { saleId, gymId },
    select: {
      name: true,
      quantity: true,
      passes: { select: { kind: true, startsAt: true, expiresAt: true, visitsLeft: true } },
    },
  });
  return lines.map((l) => {
    const pass = l.passes[0];
    if (pass?.kind === "MEMBERSHIP" && pass.expiresAt) {
      // Dates as the rest of the desk shows them (isoDay in status.ts).
      const from = formatDate(isoDay(pass.startsAt));
      const to = formatDate(isoDay(pass.expiresAt), true);
      return `${l.name}: ${from} to ${to}`;
    }
    if (pass?.kind === "PUNCH") return `${l.name}: ${pass.visitsLeft} visits`;
    if (pass?.kind === "DAY") return `${l.name}: today`;
    return l.quantity > 1 ? `${l.name} ×${l.quantity}` : l.name;
  });
}

/**
 * Tender: saves the sale once the money is taken on the card machine (or in
 * cash), and gives the climber their passes, all in one transaction.
 * Pressing Tender twice, or a retry after a dropped connection, sends the
 * same key and gets the first sale back instead of a second one.
 */
export async function recordSale(input: SaleInput): Promise<SaleResult> {
  await requireStaff();
  // TODO(auth): set staffId from the logged-in staff member.
  const refuse = (reason: string, message: string): SaleResult => {
    logEvent("sale_refused", { reason });
    return { ok: false, message };
  };
  if (!validInput(input)) return refuse("invalid_input", "Something went wrong. Start the sale again.");

  const gym = await getGym();
  if (!sellsInElevate(gym)) return refuse("gym_not_elevate", "This gym sells passes in its own system.");

  const replay = async (): Promise<SaleResult | null> => {
    const sale = await db.sale.findUnique({
      where: { gymId_idempotencyKey: { gymId: gym.id, idempotencyKey: input.idempotencyKey } },
      select: { id: true, totalCents: true, tender: true },
    });
    if (!sale) return null;
    logEvent("sale_replayed", { gymId: gym.id, saleId: sale.id });
    return {
      ok: true,
      saleId: sale.id,
      totalCents: sale.totalCents,
      tender: sale.tender,
      added: await describeSale(sale.id, gym.id),
    };
  };
  const earlier = await replay();
  if (earlier) return earlier;

  const climber = await getClimber(input.climberId);
  if (!climber) return refuse("climber_not_found", "Climber not found.");

  const products = await db.product.findMany({
    where: { gymId: gym.id, active: true, id: { in: input.items.map((i) => i.productId) } },
    select: {
      id: true,
      name: true,
      kind: true,
      priceCents: true,
      punches: true,
      durationMonths: true,
      recurring: true,
    },
  });
  const problem = checkCart(input.items, products);
  if (problem) return refuse("invalid_cart", problem);
  const priced = priceCart(input.items, products, gym.taxRateBps);
  const byId = new Map(products.map((p) => [p.id, p]));

  const now = new Date();
  const memberships = await db.pass.findMany({
    where: { gymId: gym.id, climberId: climber.id, kind: "MEMBERSHIP" },
    select: { startsAt: true, expiresAt: true },
  });
  const membershipStart = membershipStartsAt(memberships, now);

  let saleId: string;
  try {
    saleId = await db.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          gymId: gym.id,
          climberId: climber.id,
          subtotalCents: priced.subtotalCents,
          taxRateBps: priced.taxRateBps,
          taxCents: priced.taxCents,
          totalCents: priced.totalCents,
          tender: input.tender,
          idempotencyKey: input.idempotencyKey,
        },
        select: { id: true },
      });
      for (const line of priced.lines) {
        const saleLine = await tx.saleLine.create({
          data: { gymId: gym.id, saleId: sale.id, ...line },
          select: { id: true },
        });
        const pass = passFor(byId.get(line.productId)!, {
          now,
          timeZone: gym.timeZone,
          membershipStart,
        });
        if (pass) {
          await tx.pass.create({
            data: { gymId: gym.id, climberId: climber.id, saleLineId: saleLine.id, ...pass },
          });
        }
      }
      return sale.id;
    });
  } catch (error) {
    // Another request with the same key got there first: return its sale.
    if ((error as { code?: string }).code === "P2002") {
      const first = await replay();
      if (first) return first;
    }
    throw error;
  }

  logEvent("sale_recorded", {
    gymId: gym.id,
    saleId,
    climberId: climber.id,
    tender: input.tender,
    totalCents: priced.totalCents,
    lines: priced.lines.length,
    kinds: [...new Set(priced.lines.map((l) => l.kind))].sort().join(","),
  });
  refreshPosPages(climber.id);
  return {
    ok: true,
    saleId,
    totalCents: priced.totalCents,
    tender: input.tender,
    added: await describeSale(saleId, gym.id),
  };
}

/**
 * Voids a sale: the row stays, marked voided with when and why, and the
 * passes it gave stop working now. The money goes back on the card machine
 * or from the till; Elevate only records it. Any desk staff member can void.
 */
export async function voidSale(
  saleId: string,
  reason: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireStaff();
  // TODO(auth): record which staff member voided it.
  const refuse = (code: string, message: string) => {
    logEvent("sale_void_refused", { saleId: UUID.test(String(saleId)) ? saleId : undefined, reason: code });
    return { ok: false, message };
  };
  if (!UUID.test(String(saleId))) return refuse("invalid_id", "Sale not found.");
  const why = String(reason ?? "").trim();
  if (why === "") return refuse("no_reason", "Say why the sale is being voided.");
  if (why.length > 200) return refuse("reason_too_long", "Keep the reason under 200 characters.");

  const gym = await getGym();
  const sale = await db.sale.findFirst({
    where: { id: saleId, gymId: gym.id },
    select: {
      climberId: true,
      status: true,
      lines: { select: { passes: { select: { id: true, kind: true, startsAt: true } } } },
    },
  });
  if (!sale) return refuse("not_found", "Sale not found.");
  // Voiding twice is fine: it's already done.
  if (sale.status === "VOIDED") return { ok: true };

  const now = new Date();
  const voided = await db.$transaction(async (tx) => {
    const { count } = await tx.sale.updateMany({
      where: { id: saleId, gymId: gym.id, status: "PAID" },
      data: { status: "VOIDED", voidedAt: now, voidReason: why },
    });
    if (count === 0) return false;
    for (const pass of sale.lines.flatMap((l) => l.passes)) {
      await tx.pass.update({
        where: { id: pass.id },
        // A punch card loses its visits too, so it can't be used up later.
        data: {
          expiresAt: voidedExpiry(pass.startsAt, now),
          ...(pass.kind === "PUNCH" ? { visitsLeft: 0 } : {}),
        },
      });
    }
    return true;
  });
  // Someone else voided it at the same moment.
  if (!voided) return { ok: true };

  // The reason is typed by staff, so it stays out of the logs.
  logEvent("sale_voided", { gymId: gym.id, saleId, climberId: sale.climberId });
  refreshPosPages(sale.climberId);
  return { ok: true };
}
