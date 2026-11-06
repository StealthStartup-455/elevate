"use server";

import { getSessionClimberId } from "@/features/auth/queries";
import { getStaffContext, requireStaff } from "@/features/auth/staff";
import { formatTime } from "@/features/analytics/components/format";
import { ACTIVE_WINDOW_MINUTES } from "@/features/analytics/config";
import { getClimber, getSavedCheckIns } from "@/features/climbers/queries";
import type { Climber } from "@/features/climbers/types";
import { isPosEnabled } from "@/features/pos/queries";
import { getStaffWaiverPanel, type StaffWaiverPanel } from "@/features/waivers/queries";
import { ageOn } from "@/features/waivers/validate";
import { db } from "@/lib/db";
import { getGymById } from "@/lib/gym";
import { logEvent, logWarning } from "@/lib/log";
import { timed } from "@/lib/timing";
import type { MembershipStatus, WaiverStatus } from "@/features/climbers/types";
import { startOfGymDay } from "./day";
import { isDemoEmployeeCheckIn } from "./demo-examples";
import { finishScan, isScanWaiting, oldestWaitingScan, saveScan } from "./scan-store";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ScannedClimber = {
  id: string;
  name: string;
  waiverStatus: WaiverStatus;
  waiverExpiresOn?: string;
  membershipStatus: MembershipStatus;
  membershipRenewsOn?: string;
  membershipRecurring?: boolean;
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
      membershipRecurring: climber.membershipRecurring,
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

export type DeskClimberPanel = {
  climber: Climber;
  gymName: string;
  /** Whole years, from their date of birth. */
  age: number;
  waiver: StaffWaiverPanel;
  /** "12:21 p.m." on the gym's clock when they last checked in today; null if they haven't. */
  checkedInAt: string | null;
  /**
   * That check-in was in the last ACTIVE_WINDOW_MINUTES, so checkInClimber
   * would refuse another one. Later the same day they can check in again.
   */
  checkedInRecently: boolean;
  /** The gym sells passes in Elevate, so Sell pass has somewhere to go. */
  posEnabled: boolean;
  /** Came in on the demo's employee pass today: shown like the table, and nothing to sell. */
  employee: boolean;
};

// The climber panel on the Check-in page (#169). Reads only what the desk
// already reads elsewhere: the climber (getClimber, as the climber page),
// their waiver (getStaffWaiverPanel), today's check-ins (getSavedCheckIns) and
// whether the POS is on. Staff only, and only the staff member's own gym: a
// climber from another gym, or an id that isn't one, comes back null.
export async function getDeskClimberPanel(climberId: string): Promise<DeskClimberPanel | null> {
  await requireStaff();
  const staff = await getStaffContext();
  if (!staff || !UUID.test(climberId)) return null;
  const [climber, gym] = await Promise.all([getClimber(climberId), getGymById(staff.gymId)]);
  if (!climber || !gym) return null;
  const now = new Date();
  const [waiver, today, posEnabled] = await Promise.all([
    getStaffWaiverPanel(climber.id),
    getSavedCheckIns(startOfGymDay(now, gym.timeZone)),
    isPosEnabled(),
  ]);
  // Newest first, so this is their latest check-in today.
  const latest = today.find((c) => c.climberId === climber.id);
  return {
    climber,
    gymName: gym.name,
    age: ageOn(climber.dateOfBirth, now),
    waiver,
    checkedInAt: latest ? formatTime(latest.timestamp, gym.timeZone) : null,
    checkedInRecently: !!latest && latest.timestamp.getTime() > now.getTime() - ACTIVE_WINDOW_MINUTES * 60_000,
    posEnabled,
    employee: !!latest && isDemoEmployeeCheckIn(latest.id),
  };
}
