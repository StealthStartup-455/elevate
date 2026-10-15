"use server";

import { getSessionClimberId } from "@/features/auth/session";
import { getClimber } from "@/features/climbers/queries";
import type { MembershipStatus, WaiverStatus } from "@/features/climbers/types";
import { saveScan, takeScan } from "./scan-store";

export type ScannedClimber = {
  id: string;
  name: string;
  waiverStatus: WaiverStatus;
  waiverExpiresOn?: string;
  membershipStatus: MembershipStatus;
  membershipRenewsOn?: string;
};

// /me "Demo scan": remembers that the signed-in climber just scanned, so the
// front desk can show them.
export async function recordScan(): Promise<{ ok: boolean }> {
  const climberId = await getSessionClimberId();
  if (!climberId) return { ok: false };
  saveScan({ climberId, scannedAt: Date.now() });
  return { ok: true };
}

// The climber from the latest scan, for the front desk popup. Returns each
// scan once, then null until someone scans again.
// TODO(auth): staff only.
export async function takeLatestScan(): Promise<ScannedClimber | null> {
  const scan = takeScan();
  if (!scan) return null;
  const climber = await getClimber(scan.climberId);
  if (!climber) return null;
  return {
    id: climber.id,
    name: `${climber.firstName} ${climber.lastName}`,
    waiverStatus: climber.waiverStatus,
    waiverExpiresOn: climber.waiverExpiresOn,
    membershipStatus: climber.membershipStatus,
    membershipRenewsOn: climber.membershipRenewsOn,
  };
}
