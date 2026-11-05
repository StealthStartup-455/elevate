import { connection } from "next/server";
import { requireStaff } from "@/features/auth/staff";
import { getSavedCheckIns } from "@/features/climbers/queries";
import { activeWindowStart, getBusynessLevel, gymClock } from "./busyness";
import { ACTIVE_WINDOW_MINUTES, getGymBusynessSettings } from "./config";
import { DEMO_CHECK_IN_PREFIX, mockWeek } from "./mock-data";
import type {
  ActiveCheckIn,
  BusynessSummary,
  FrontDeskBusyness,
  WeeklyBusyness,
} from "./types";

// Busyness is computed, not stored: a climber is "in the gym" for
// ACTIVE_WINDOW_MINUTES after checking in. There is no checked-out state.

/** All attendance uses the real clock and saved visits, including demo visits. */
async function busynessNow(): Promise<Date> {
  await connection();
  return new Date();
}

export async function getActiveCheckIns(
  gymId: string,
  now: Date,
): Promise<ActiveCheckIn[]> {
  const since = activeWindowStart(now, ACTIVE_WINDOW_MINUTES);
  const saved = await getSavedCheckIns(since, now);
  const live: ActiveCheckIn[] = saved.map((c) => ({
    id: c.id,
    climberId: c.climberId,
    gymId,
    timestamp: c.timestamp,
    climber: {
      id: c.climberId,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      waiverStatus: c.waiverStatus,
    },
    sample: c.id.startsWith(DEMO_CHECK_IN_PREFIX),
  }));

  return live.sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );
}

function summarize(
  gymId: string,
  checkIns: ActiveCheckIn[],
  now: Date,
): BusynessSummary {
  const { thresholds } = getGymBusynessSettings(gymId);
  return {
    gymId,
    count: checkIns.length,
    level: getBusynessLevel(checkIns.length, thresholds),
    windowMinutes: ACTIVE_WINDOW_MINUTES,
    computedAt: now,
    sampleCount: checkIns.filter((c) => c.sample).length,
  };
}

// Staff view: count, level and the check-ins behind them.
export async function getFrontDeskBusyness(
  gymId: string,
): Promise<FrontDeskBusyness> {
  const now = await busynessNow();
  // Names and phone numbers: staff only.
  await requireStaff();
  const checkIns = await getActiveCheckIns(gymId, now);
  return { ...summarize(gymId, checkIns, now), checkIns };
}

// Climber view: the same numbers with no personal data, so nothing about
// other climbers reaches a member's browser.
export async function getBusynessSummary(
  gymId: string,
): Promise<BusynessSummary> {
  const now = await busynessNow();
  const checkIns = await getActiveCheckIns(gymId, now);
  return summarize(gymId, checkIns, now);
}

/**
 * Typical busyness by weekday and hour, for the heat map.
 *
 * Mock for now. The real version averages the active count per hour over
 * the last few weeks of check-ins.
 */
export async function getWeeklyBusyness(gymId: string): Promise<WeeklyBusyness> {
  const now = await busynessNow();
  const { timeZone } = getGymBusynessSettings(gymId);
  const { startHour, endHour, days, values } = mockWeek();
  // Always generated for now, so always labelled (#64); real once #39 lands.
  return { gymId, startHour, endHour, days, values, now: gymClock(now, timeZone), sample: true };
}
