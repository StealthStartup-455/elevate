import { connection } from "next/server";
import { requireStaff } from "@/features/auth/staff";
import { getSavedCheckIns } from "@/features/climbers/queries";
import { activeWindowStart, getBusynessLevel, gymClock } from "./busyness";
import { ACTIVE_WINDOW_MINUTES, getGymBusynessSettings } from "./config";
import { mockCheckIns, mockClimbers, mockNow, mockWeek } from "./mock-data";
import type {
  ActiveCheckIn,
  BusynessSummary,
  FrontDeskBusyness,
  WeeklyBusyness,
} from "./types";

// Busyness is computed, not stored: a climber is "in the gym" for
// ACTIVE_WINDOW_MINUTES after checking in. There is no checked-out state.

/**
 * The current time for busyness. With a mock scenario, the scenario's fixed
 * clock, so its results are the same on every request; with `none`, the real
 * clock (see mockNow).
 *
 * When the mock goes (#39), return `new Date()` instead.
 */
async function busynessNow(): Promise<Date> {
  // Render per request, never at build time.
  await connection();
  return mockNow();
}

/**
 * Check-ins for a gym inside the active window, newest first.
 *
 * This is the only function that reads check-in data. To switch to the
 * database, replace the body with a query like
 * `timestamp > now - ACTIVE_WINDOW_MINUTES` joined to the climber.
 */
export async function getActiveCheckIns(
  gymId: string,
  now: Date,
): Promise<ActiveCheckIn[]> {
  const since = activeWindowStart(now, ACTIVE_WINDOW_MINUTES);
  const climbers = new Map(mockClimbers().map((c) => [c.id, c]));

  const mock = mockCheckIns()
    .filter((c) => c.gymId === gymId && c.timestamp > since && c.timestamp <= now)
    .flatMap((c) => {
      const climber = climbers.get(c.climberId);
      return climber ? [{ ...c, climber, sample: true }] : [];
    });

  // Visits saved by the front desk happen on the real clock, not the mock's,
  // so they are cut off by the real active window.
  const saved = await getSavedCheckIns(
    activeWindowStart(new Date(), ACTIVE_WINDOW_MINUTES),
  );
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
    sample: false,
  }));

  return [...live, ...mock].sort(
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
