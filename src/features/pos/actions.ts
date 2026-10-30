"use server";

import { requireStaff } from "@/features/auth/staff";
import { db } from "@/lib/db";
import { getGym } from "@/lib/gym";
import { logEvent } from "@/lib/log";
import { voidedExpiry } from "./passes";
import { refreshSalePages, saveSale, type SaleInput, type SaleResult } from "./sale";
import type { Tender } from "./types";

export type { SaleInput, SaleResult };

// Server actions are public POST endpoints, so each one checks for staff
// itself and trusts nothing from the browser: prices, totals and passes are
// worked out here again from the database.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// The desk takes card or cash; ONLINE is only for a climber buying in the app.
const TENDERS: readonly Tender[] = ["CARD", "CASH"];
const MAX_LINES = 30;

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

/**
 * Tender: saves the sale once the money is taken on the card machine (or in
 * cash), and gives the climber their passes, all in one transaction.
 * Pressing Tender twice, or a retry after a dropped connection, sends the
 * same key and gets the first sale back instead of a second one.
 */
export async function recordSale(input: SaleInput): Promise<SaleResult> {
  await requireStaff();
  // TODO(auth): set staffId from the logged-in staff member.
  if (!validInput(input)) {
    logEvent("sale_refused", { reason: "invalid_input" });
    return { ok: false, message: "Something went wrong. Start the sale again." };
  }
  return saveSale(input);
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
  refreshSalePages(sale.climberId);
  return { ok: true };
}
