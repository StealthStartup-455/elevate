"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionClimberId } from "@/features/auth/queries";
import { getStaffContext, requireStaff } from "@/features/auth/staff";
import { getClimber } from "@/features/climbers/queries";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/log";
import { toSummary } from "./queries";
import type { BankAccountInput, BankAccountResult } from "./types";
import { validateBankAccount } from "./validate";

// Server actions are public POST endpoints. The member's own actions take the
// climber from the session, never from the request, so nobody can change
// another climber's account. The desk's actions check for staff and only
// reach a climber of the staff member's own gym (getClimber, #34). A mock (#179): nothing is sent to a bank or payment processor and
// nothing is ever debited. The full account number is used only to keep its
// last four digits; it is never saved or logged.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The signed-in climber and their gym, or null.
async function me(): Promise<{ id: string; gymId: string } | null> {
  const id = await getSessionClimberId();
  if (!id || !UUID.test(id)) return null;
  return db.climber.findUnique({ where: { id }, select: { id: true, gymId: true } });
}

type Owner = { id: string; gymId: string };

// The desk's climber: staff only, own gym only. Null if not found.
async function deskClimber(climberId: string): Promise<Owner | null> {
  await requireStaff();
  const staff = await getStaffContext();
  const climber = await getClimber(String(climberId ?? ""));
  return staff && climber ? { id: climber.id, gymId: staff.gymId } : null;
}

function refresh(climberId: string) {
  revalidatePath("/me/membership");
  revalidatePath("/desk/pos");
  revalidatePath(`/desk/customers/${climberId}`);
}

async function save(climber: Owner, input: BankAccountInput, source: string): Promise<BankAccountResult> {
  const checked = validateBankAccount(input);
  if (!checked.ok) {
    logEvent("bank_account_refused", { reason: "invalid_input", climberId: climber.id, source });
    return { ok: false, message: "Check the highlighted fields.", errors: checked.errors };
  }

  const { accountNumber, ...rest } = checked.value;
  const data = {
    ...rest,
    accountLast4: accountNumber.slice(-4),
    // Stands in for the token a payment processor would give back (#31).
    token: `mock_eft_${randomUUID()}`,
  };
  const row = await db.bankAccount.upsert({
    where: { climberId_gymId: { climberId: climber.id, gymId: climber.gymId } },
    create: { ...data, climberId: climber.id, gymId: climber.gymId },
    update: data,
  });

  logEvent("bank_account_saved", { gymId: climber.gymId, climberId: climber.id, source });
  refresh(climber.id);
  return { ok: true, account: toSummary(row) };
}

async function remove(climber: Owner, source: string): Promise<BankAccountResult> {
  const { count } = await db.bankAccount.deleteMany({ where: { climberId: climber.id, gymId: climber.gymId } });
  if (count > 0) logEvent("bank_account_removed", { gymId: climber.gymId, climberId: climber.id, source });
  refresh(climber.id);
  return { ok: true, account: null };
}

/**
 * Adds or replaces the signed-in climber's bank account for EFT of their
 * monthly membership. One per climber: saving again replaces it.
 */
export async function saveMyBankAccount(input: BankAccountInput): Promise<BankAccountResult> {
  const climber = await me();
  if (!climber) {
    logEvent("bank_account_refused", { reason: "not_signed_in" });
    return { ok: false, message: "Log in to add a bank account." };
  }
  return save(climber, input, "member");
}

/** Removes the signed-in climber's bank account. Removing twice is fine. */
export async function removeMyBankAccount(): Promise<BankAccountResult> {
  const climber = await me();
  if (!climber) {
    logEvent("bank_account_refused", { reason: "not_signed_in" });
    return { ok: false, message: "Log in to remove your bank account." };
  }
  return remove(climber, "member");
}

/**
 * The desk adds or replaces a climber's bank account, for a member who gives
 * their details at the front desk. Staff only, own gym only.
 */
export async function saveClimberBankAccount(climberId: string, input: BankAccountInput): Promise<BankAccountResult> {
  const climber = await deskClimber(climberId);
  if (!climber) {
    logEvent("bank_account_refused", { reason: "climber_not_found", source: "desk" });
    return { ok: false, message: "Climber not found." };
  }
  return save(climber, input, "desk");
}

/** The desk removes a climber's bank account. Staff only, own gym only. */
export async function removeClimberBankAccount(climberId: string): Promise<BankAccountResult> {
  const climber = await deskClimber(climberId);
  if (!climber) {
    logEvent("bank_account_refused", { reason: "climber_not_found", source: "desk" });
    return { ok: false, message: "Climber not found." };
  }
  return remove(climber, "desk");
}
