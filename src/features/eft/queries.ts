import { connection } from "next/server";
import { getSessionClimberId } from "@/features/auth/queries";
import { getStaffContext, requireStaff } from "@/features/auth/staff";
import { getClimber } from "@/features/climbers/queries";
import { isoDay } from "@/features/climbers/status";
import { db } from "@/lib/db";
import { accountLabel, bankName } from "./banks";
import type { BankAccountSummary } from "./types";

// Reads for EFT bank accounts. Every query is limited to the gym
// (prisma/DATABASE.md); callers pass the gym from the session, never the page.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SELECT = {
  holderName: true,
  institutionNumber: true,
  transitNumber: true,
  accountLast4: true,
  updatedAt: true,
} as const;

type Row = { holderName: string; institutionNumber: string; transitNumber: string; accountLast4: string; updatedAt: Date };

export function toSummary(row: Row): BankAccountSummary {
  return {
    holderName: row.holderName,
    bank: bankName(row.institutionNumber),
    institutionNumber: row.institutionNumber,
    transitNumber: row.transitNumber,
    last4: row.accountLast4,
    label: accountLabel(row.institutionNumber, row.accountLast4),
    updatedOn: isoDay(row.updatedAt),
  };
}

/** One climber's account in a gym, or null. The caller has checked access. */
export async function getBankAccount(gymId: string, climberId: string): Promise<BankAccountSummary | null> {
  if (!UUID.test(climberId)) return null;
  const row = await db.bankAccount.findUnique({
    where: { climberId_gymId: { climberId, gymId } },
    select: SELECT,
  });
  return row ? toSummary(row) : null;
}

/** Which of these climbers have an account on file, for the POS renewals list. */
export async function climbersWithBankAccount(gymId: string, climberIds: string[]): Promise<Set<string>> {
  if (climberIds.length === 0) return new Set();
  const rows = await db.bankAccount.findMany({
    where: { gymId, climberId: { in: climberIds } },
    select: { climberId: true },
  });
  return new Set(rows.map((r) => r.climberId));
}

/** The signed-in climber's own account, or null (also when nobody is signed in). */
export async function getMyBankAccount(): Promise<BankAccountSummary | null> {
  await connection();
  const climberId = await getSessionClimberId();
  if (!climberId || !UUID.test(climberId)) return null;
  const row = await db.bankAccount.findFirst({ where: { climberId }, select: SELECT });
  return row ? toSummary(row) : null;
}

/**
 * A climber's account for the desk (POS card, customer page). Staff only, and
 * only a climber of the staff member's own gym: getClimber limits it (#34).
 * Undefined when the climber isn't found; null when none is on file.
 */
export async function getBankAccountForStaff(climberId: string): Promise<BankAccountSummary | null | undefined> {
  await requireStaff();
  const staff = await getStaffContext();
  const climber = await getClimber(String(climberId ?? ""));
  if (!staff || !climber) return undefined;
  return getBankAccount(staff.gymId, climber.id);
}
