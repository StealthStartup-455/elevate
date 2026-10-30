import { getCurrentUser, getSessionClimberId } from "@/features/auth/queries";
import { isStaff } from "@/features/auth/staff";

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
