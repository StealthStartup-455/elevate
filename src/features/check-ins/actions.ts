"use server";

import { getSessionClimberId } from "@/features/auth/queries";
import { getStaffContext, requireStaff } from "@/features/auth/staff";
import { getClimber } from "@/features/climbers/queries";
import { db } from "@/lib/db";
import { logEvent, logWarning } from "@/lib/log";
import { timed } from "@/lib/timing";
import type { MembershipStatus, WaiverStatus } from "@/features/climbers/types";
import { finishScan, isScanWaiting, oldestWaitingScan, saveScan } from "./scan-store";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
// front desk can show them. The scan goes to the climber's own gym: that's the
// only desk that can show them. (A staff login that also climbs somewhere else
// used to send it to the gym they work at.) A real scanner will send the desk's
// gym instead (#38).
export async function recordScan(): Promise<{ ok: boolean }> {
  // The signed-in climber (demo cookie or their own login), so no further
  // access check is needed.
  const climberId = await getSessionClimberId();
  if (!climberId) return { ok: false };
  const gymId = await getGymForClimberId(climberId);
  if (!gymId) return { ok: false };
  await saveScan(gymId, climberId);
  logEvent("scan_saved", { gymId, climberId });
  return { ok: true };
}

// The desk's view of a waiting scan: which scan, and the climber behind it.
export type DeskScan = { scanId: string; climber: ScannedClimber };

// The oldest scan waiting at the staff member's gym, for the desk popup.
// Polled by every open desk page. It doesn't take the scan: every desk gets
// the same one until someone deals with it (finishDeskScan), so a desk on
// another page, a reload or a second desk never loses an arrival (#127).
// Staff only.
export async function nextDeskScan(): Promise<DeskScan | null> {
  // Polled every few seconds by every desk, so its total time matters (#84, #86).
  return timed("perf_action", { name: "nextDeskScan" }, nextDeskScanNow);
}

async function nextDeskScanNow(): Promise<DeskScan | null> {
  await requireStaff();
  const staff = await getStaffContext();
  if (!staff) return null;
  const scan = await oldestWaitingScan(staff.gymId);
  if (!scan) return null;
  const climber = await getClimber(scan.climberId);
  if (!climber || climber.id !== scan.climberId) {
    // Nobody can deal with a scan for a climber the desk can't load, so
    // clear it rather than block the ones behind it.
    logWarning("scan_climber_missing", { gymId: staff.gymId, climberId: scan.climberId });
    await finishScan(staff.gymId, scan.id);
    return null;
  }
  return {
    scanId: scan.id,
    climber: {
      id: climber.id,
      name: `${climber.firstName} ${climber.lastName}`,
      waiverStatus: climber.waiverStatus,
      waiverExpiresOn: climber.waiverExpiresOn,
      membershipStatus: climber.membershipStatus,
      membershipRenewsOn: climber.membershipRenewsOn,
      hasDayPass: climber.hasDayPass,
      punchesLeft: climber.punchesLeft,
    },
  };
}

// Whether the scan a desk is showing is still waiting. False once another
// desk has dealt with it, so that desk's popup can close. Staff only.
export async function isDeskScanWaiting(scanId: string): Promise<boolean> {
  await requireStaff();
  const staff = await getStaffContext();
  if (!staff || !UUID.test(String(scanId))) return false;
  return isScanWaiting(staff.gymId, scanId);
}

// Staff dealt with a scan: checked the person in, or closed the popup. Clears
// it (and any repeat taps by the same climber) from every desk. Staff only.
export async function finishDeskScan(
  scanId: string,
  outcome: "checked_in" | "closed",
): Promise<void> {
  await requireStaff();
  const staff = await getStaffContext();
  if (!staff || !UUID.test(String(scanId))) return;
  const scan = await finishScan(staff.gymId, scanId);
  if (!scan) return;
  // Time from the climber's tap to staff dealing with them: the number behind
  // any "faster check-in" claim.
  logEvent("scan_taken", {
    gymId: staff.gymId,
    climberId: scan.climberId,
    waitMs: Date.now() - scan.scannedAt.getTime(),
    outcome: outcome === "checked_in" ? "checked_in" : "closed",
  });
}
