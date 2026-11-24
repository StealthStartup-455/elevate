"use server";

import { getStaffContext, requireStaff } from "@/features/auth/staff";
import { recordCheckInAttempt } from "./record";
import { parseCheckInTiming, type CheckInTiming } from "./timing";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Staff closed the Check in dialog with a climber picked but not checked in,
 * usually because something blocked them (#251). Saved so "sent away" shows
 * on the metrics page; checkInClimber saves the other outcomes.
 */
export async function recordCheckInGaveUp(climberId: string, timing?: CheckInTiming): Promise<void> {
  await requireStaff();
  const staff = await getStaffContext();
  if (!staff || !UUID.test(String(climberId))) return;
  await recordCheckInAttempt({
    ...parseCheckInTiming(timing),
    gymId: staff.gymId,
    climberId,
    outcome: "GAVE_UP",
  });
}
