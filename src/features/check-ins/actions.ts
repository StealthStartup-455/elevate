"use server";

import { getSessionClimberId } from "@/features/auth/queries";
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

// When the desk page starts watching for scans, on the server's clock so the
// browser's clock doesn't matter. The desk passes it back to takeLatestScan.
export async function startWatchingScans(): Promise<string> {
  await requireStaff();
  return new Date().toISOString();
}

// A day is longer than any desk session that matters; anything older, or not
// a date, falls back to the usual time limit.
const MAX_WATCH_MS = 24 * 60 * 60 * 1000;

function watchStart(value: string | undefined, now: Date): Date | undefined {
  if (!value) return undefined;
  const at = new Date(value);
  const age = now.getTime() - at.getTime();
  return Number.isNaN(at.getTime()) || age < 0 || age > MAX_WATCH_MS ? undefined : at;
}

// The climber from the latest scan, for the front desk popup. Returns each
// scan once, then null until someone scans again. Only scans made after
// `watchingSince` (from startWatchingScans) count (#91). Staff only.
export async function takeLatestScan(watchingSince?: string): Promise<ScannedClimber | null> {
  // Polled every few seconds by the desk, so its total time matters (#84, #86).
  return timed("perf_action", { name: "takeLatestScan" }, () => takeLatestScanNow(watchingSince));
}

async function takeLatestScanNow(watchingSince?: string): Promise<ScannedClimber | null> {
  await requireStaff();
  const staff = await getStaffContext();
  if (!staff) return null;
  const gymId = staff.gymId;
  const now = new Date();
  const scan = await takeScan(gymId, now, watchStart(watchingSince, now));
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
