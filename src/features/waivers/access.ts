import { getCurrentUser, getSessionClimberId } from "@/features/auth/queries";
import { hasDemoDeskSession } from "@/features/auth/session";
import { hasStaffRole, isStaff } from "@/features/auth/staff";

/**
 * Whether the person signed in may sign or read waivers for this climber:
 * the climber themselves, a parent whose login manages them, or staff.
 * Server actions are public URLs, so every waiver action and read calls this.
 */
export async function canActForClimber(climberId: string): Promise<boolean> {
  if (climberId === (await getSessionClimberId())) return true;
  if ((await getCurrentUser())?.climberIds.includes(climberId)) return true;
  return isStaff();
}

/**
 * Whether the person signed in may publish new waiver wording (#110). It's a
 * legal document and makes every climber sign again, so only managers and
 * owners, plus the demo "desk" login so the demo can show it.
 */
export async function canEditWaiver(): Promise<boolean> {
  if (await hasDemoDeskSession()) return true;
  return hasStaffRole("MANAGER", "OWNER");
}
