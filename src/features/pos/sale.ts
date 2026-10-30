import { formatDate } from "@/features/climbers/format";
import { getClimber } from "@/features/climbers/queries";
import { isoDay } from "@/features/climbers/status";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getGym } from "@/lib/gym";
import { logEvent } from "@/lib/log";
import { checkCart, priceCart } from "./cart";
import { membershipStartsAt, passFor } from "./passes";
import { sellsInElevate } from "./queries";
import type { CartItem, Tender } from "./types";

// Saving a sale, shared by the desk (actions.ts, Tender) and the climber's own
// purchase (features/purchase). This file does no sign-in check: each caller
// must check who is asking, and pass a climber id it trusts (the desk's
// picked climber after requireStaff, or the signed-in climber's own id).
// Prices, totals and passes are always worked out here from the database.

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

export function refreshSalePages(climberId: string) {
  revalidatePath("/desk/pos");
  revalidatePath("/desk");
  revalidatePath("/me");
  revalidatePath("/me/purchase");
  revalidatePath(`/desk/climbers/${climberId}`);
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
 * Saves the sale and gives the climber their passes, all in one transaction.
 * A second call with the same key (a double press, or a retry after a dropped
 * connection) returns the first sale instead of saving another.
 */
export async function saveSale(input: SaleInput): Promise<SaleResult> {
  const refuse = (reason: string, message: string): SaleResult => {
    logEvent("sale_refused", { reason });
    return { ok: false, message };
  };

  const gym = await getGym();
  if (!sellsInElevate(gym)) return refuse("gym_not_elevate", "This gym sells passes in its own system.");

  const replay = async (): Promise<SaleResult | null> => {
    const sale = await db.sale.findUnique({
      where: { gymId_idempotencyKey: { gymId: gym.id, idempotencyKey: input.idempotencyKey } },
      select: { id: true, climberId: true, totalCents: true, tender: true },
    });
    if (!sale) return null;
    // A key is only ever replayed for the climber it was made for; another
    // climber's sale is never described to someone else.
    if (sale.climberId !== input.climberId) {
      return refuse("key_reused", "Something went wrong. Start again.");
    }
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
  refreshSalePages(climber.id);
  return {
    ok: true,
    saleId,
    totalCents: priced.totalCents,
    tender: input.tender,
    added: await describeSale(saleId, gym.id),
  };
}
