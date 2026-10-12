import { connection } from "next/server";
import { getBusynessLevel, activeWindowStart } from "./busyness";
import { ACTIVE_WINDOW_MINUTES, getGymBusynessSettings } from "./config";
import { MOCK_CLIMBERS, mockCheckIns } from "./mock-data";
import type {
  ActiveCheckIn,
  BusynessSummary,
  FrontDeskBusyness,
} from "./types";

// Busyness is computed, not stored: a climber is "in the gym" for
// ACTIVE_WINDOW_MINUTES after checking in. There is no checked-out state.

/**
 * Check-ins for a gym inside the active window, newest first.
 *
 * This is the only function that reads check-in data. To switch to the
 * database, replace the body with a query like
 * `timestamp > now - ACTIVE_WINDOW_MINUTES` joined to the climber.
 */
export async function getActiveCheckIns(
  gymId: string,
  now: Date = new Date(),
): Promise<ActiveCheckIn[]> {
  const since = activeWindowStart(now, ACTIVE_WINDOW_MINUTES);
  const climbers = new Map(MOCK_CLIMBERS.map((c) => [c.id, c]));

  return mockCheckIns(now)
    .filter((c) => c.gymId === gymId && c.timestamp > since)
    .flatMap((c) => {
      const climber = climbers.get(c.climberId);
      return climber ? [{ ...c, climber }] : [];
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function summarize(
  gymId: string,
  activeCount: number,
  now: Date,
): BusynessSummary {
  const { thresholds } = getGymBusynessSettings(gymId);
  return {
    gymId,
    count: activeCount,
    level: getBusynessLevel(activeCount, thresholds),
    windowMinutes: ACTIVE_WINDOW_MINUTES,
    computedAt: now,
  };
}

// Staff view: count, level and the check-ins behind them.
export async function getFrontDeskBusyness(
  gymId: string,
): Promise<FrontDeskBusyness> {
  // Render per request, never at build time.
  await connection();
  const now = new Date();
  const checkIns = await getActiveCheckIns(gymId, now);
  return { ...summarize(gymId, checkIns.length, now), checkIns };
}

// Climber view: the same numbers with no personal data, so nothing about
// other climbers reaches a member's browser.
export async function getBusynessSummary(
  gymId: string,
): Promise<BusynessSummary> {
  await connection();
  const now = new Date();
  const checkIns = await getActiveCheckIns(gymId, now);
  return summarize(gymId, checkIns.length, now);
}
