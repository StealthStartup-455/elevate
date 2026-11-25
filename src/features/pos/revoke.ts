import { isoDayIn } from "@/features/climbers/status";
import type { MembershipStatus } from "@/features/climbers/types";
import { db } from "@/lib/db";
import type { MembershipRevoke } from "./types";

/**
 * Why the climber's membership was revoked (#241), for the desk: the Check-in
 * climber panel, the POS climber card and their page under Customers. Null
 * unless it has ended that way: a membership bought since makes it active,
 * and the old revoke no longer applies. Callers check for staff; the reason
 * is never shown to the climber.
 */
export async function getMembershipRevoke(
  gym: { id: string; timeZone: string },
  climber: { id: string; membershipStatus: MembershipStatus },
): Promise<MembershipRevoke | null> {
  if (climber.membershipStatus !== "expired") return null;
  const pass = await db.pass.findFirst({
    where: { gymId: gym.id, climberId: climber.id, kind: "MEMBERSHIP", revokedAt: { not: null } },
    orderBy: { revokedAt: "desc" },
    select: { revokedAt: true, revokeReason: true, revokedBy: { select: { name: true } } },
  });
  if (!pass?.revokedAt || !pass.revokeReason) return null;
  return {
    on: isoDayIn(pass.revokedAt, gym.timeZone),
    reason: pass.revokeReason,
    by: pass.revokedBy?.name ?? null,
  };
}
