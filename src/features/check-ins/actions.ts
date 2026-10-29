"use server";

import { getSessionClimberId } from "@/features/auth/queries";
import { requireStaff } from "@/features/auth/staff";
import { getClimber } from "@/features/climbers/queries";
import { getGym } from "@/lib/gym";
import { logEvent, logWarning } from "@/lib/log";
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
  await requireStaff();
  const gym = await getGym();
  const now = new Date();
  const scan = await takeScan(gym.id, now, watchStart(watchingSince, now));
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
