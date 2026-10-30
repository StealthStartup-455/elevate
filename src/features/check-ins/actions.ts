"use server";

import { getCurrentUser, getSessionClimberId } from "@/features/auth/queries";
import { getDemoClimberId } from "@/features/auth/session";
import { getStaffContext, requireStaff } from "@/features/auth/staff";
import { getClimber } from "@/features/climbers/queries";
import { db } from "@/lib/db";
import { logEvent, logWarning } from "@/lib/log";
import { timed } from "@/lib/timing";
import type { MembershipStatus, WaiverStatus } from "@/features/climbers/types";
import { saveScan, takeScan } from "./scan-store";

export type ScannedClimber = {
  id: string;
  name: string;
  waiverStatus: WaiverStatus;
  waiverExpiresOn?: string;
  membershipStatus: MembershipStatus;
  membershipRenewsOn?: string;
  hasDayPass: boolean;
  punchesLeft: number;
};

async function getGymForClimberId(climberId: string): Promise<string | null> {
  const record = await db.climber.findUnique({
    where: { id: climberId },
    select: { gymId: true },
  });
  return record?.gymId ?? null;
}

// /me "Simulate scan" (#94): remembers that the signed-in climber just scanned, so the
// front desk can show them.
export async function recordScan(): Promise<{ ok: boolean }> {
  const climberId = await getSessionClimberId();
  if (!climberId) return { ok: false };
  const user = await getCurrentUser();
  const demoClimberId = await getDemoClimberId();
  const gymId =
    user?.staff?.gymId ??
    (user && user.climberIds.includes(climberId)
      ? (await getGymForClimberId(climberId))
      : null) ??
    (demoClimberId === climberId ? (await getGymForClimberId(climberId)) : null);
  if (!gymId) return { ok: false };
  await saveScan(gymId, climberId);
  logEvent("scan_saved", { gymId, climberId });
  return { ok: true };
}

// The climber from the latest scan, for the front desk popup. Returns each
// scan once, then null until someone scans again. Staff only.
export async function takeLatestScan(): Promise<ScannedClimber | null> {
  // Polled every few seconds by the desk, so its total time matters (#84, #86).
  return timed("perf_action", { name: "takeLatestScan" }, takeLatestScanNow);
}

async function takeLatestScanNow(): Promise<ScannedClimber | null> {
  await requireStaff();
  const staff = await getStaffContext();
  if (!staff) return null;
  const gymId = staff.gymId;
  const scan = await takeScan(gymId);
  if (!scan) return null;
  const climber = await getClimber(scan.climberId);
  if (!climber || climber.id !== scan.climberId) {
    logWarning("scan_climber_missing", { gymId, climberId: scan.climberId });
    return null;
  }
  // Time from the climber's tap to the desk showing them: the number behind
  // any "faster check-in" claim.
  logEvent("scan_taken", {
    gymId,
    climberId: climber.id,
    waitMs: Date.now() - scan.scannedAt.getTime(),
    waiverStatus: climber.waiverStatus,
    membershipStatus: climber.membershipStatus,
  });
  return {
    id: climber.id,
    name: `${climber.firstName} ${climber.lastName}`,
    waiverStatus: climber.waiverStatus,
    waiverExpiresOn: climber.waiverExpiresOn,
    membershipStatus: climber.membershipStatus,
    membershipRenewsOn: climber.membershipRenewsOn,
    hasDayPass: climber.hasDayPass,
    punchesLeft: climber.punchesLeft,
  };
}
