"use server";

import { getSessionClimberId } from "@/features/auth/queries";
import { requireStaff } from "@/features/auth/staff";
import { getClimber } from "@/features/climbers/queries";
import { getGym } from "@/lib/gym";
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
};

// /me "Demo scan": remembers that the signed-in climber just scanned, so the
// front desk can show them.
export async function recordScan(): Promise<{ ok: boolean }> {
  const climberId = await getSessionClimberId();
  if (!climberId) return { ok: false };
  const gym = await getGym();
  await saveScan(gym.id, climberId);
  logEvent("scan_saved", { gymId: gym.id, climberId });
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
  const gym = await getGym();
  const scan = await takeScan(gym.id);
  if (!scan) return null;
  const climber = await getClimber(scan.climberId);
  if (!climber) {
    logWarning("scan_climber_missing", { gymId: gym.id, climberId: scan.climberId });
    return null;
  }
  // Time from the climber's tap to the desk showing them: the number behind
  // any "faster check-in" claim.
  logEvent("scan_taken", {
    gymId: gym.id,
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
  };
}
