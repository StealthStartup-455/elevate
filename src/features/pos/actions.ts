"use server";

import { getStaffContext, requireStaff } from "@/features/auth/staff";
import { getClimber, searchClimbers } from "@/features/climbers/queries";
import { db } from "@/lib/db";
import { getGymById } from "@/lib/gym";
import { logEvent } from "@/lib/log";
import { voidedExpiry } from "./passes";
import { getStaffGym, toPosClimber } from "./queries";
import { refreshSalePages, saveSale, type SaleInput, type SaleResult } from "./sale";
import type { PosClimber, Tender } from "./types";

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
  const refuse = (reason: string, message: string): SaleResult => {
    logEvent("sale_refused", { reason });
    return { ok: false, message };
  };
  if (!validInput(input)) return refuse("invalid_input", "Something went wrong. Start the sale again.");

  // The signed-in staff member's gym (#34); null id for the demo desk login.
  const staff = await getStaffContext();
  const gym = staff ? await getGymById(staff.gymId) : null;
  if (!staff || !gym) return refuse("no_staff_gym", "Log in again to sell.");
  return saveSale(input, { gym, staffId: staff.id });
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

  const gym = await getStaffGym();
  if (!gym) return refuse("no_staff_gym", "Log in again to void.");
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

/**
 * Revokes a climber's membership: every membership pass that hasn't ended
 * stops now, including a renewal bought early, and stops renewing. The sales
 * stay as they are; to give money back, void the sale instead. Any desk
 * staff member can revoke.
 */
export async function revokeMembership(climberId: string): Promise<{ ok: boolean; message?: string }> {
  await requireStaff();
  // TODO(auth): record which staff member revoked it.
  const refuse = (code: string, message: string) => {
    logEvent("membership_revoke_refused", { reason: code });
    return { ok: false, message };
  };
  if (!UUID.test(String(climberId))) return refuse("invalid_id", "Climber not found.");

  const gym = await getStaffGym();
  if (!gym) return refuse("no_staff_gym", "Log in again to revoke.");
  const climber = await getClimber(climberId);
  if (!climber) return refuse("climber_not_found", "Climber not found.");

  const now = new Date();
  const passes = await db.pass.findMany({
    where: {
      gymId: gym.id,
      climberId: climber.id,
      kind: "MEMBERSHIP",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true, startsAt: true },
  });
  // Already revoked, or never had one: nothing to do.
  if (passes.length === 0) return { ok: true };

  await db.$transaction(
    passes.map((pass) =>
      db.pass.update({
        where: { id: pass.id },
        data: { expiresAt: voidedExpiry(pass.startsAt, now), renews: false },
      }),
    ),
  );

  logEvent("membership_revoked", { gymId: gym.id, climberId: climber.id, passes: passes.length });
  refreshSalePages(climber.id);
  return { ok: true };
}

// The POS climber search: the same server search as Manual check in (#85),
// so the page never carries every climber. Staff only (searchClimbers checks).
const MAX_RESULTS = 8;

export async function findPosClimbers(query: string): Promise<PosClimber[]> {
  const climbers = await searchClimbers(String(query ?? ""), MAX_RESULTS);
  return climbers.map(toPosClimber);
}

/** One climber, fresh, for the POS's climber card. Null if not in this gym. */
export async function getPosClimber(climberId: string): Promise<PosClimber | null> {
  await requireStaff();
  const climber = await getClimber(String(climberId ?? ""));
  return climber ? toPosClimber(climber) : null;
}
