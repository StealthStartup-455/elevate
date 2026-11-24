import { connection } from "next/server";
import { getStaffContext } from "@/features/auth/staff";
import { SCAN_TTL_MS } from "@/features/check-ins/scan-store";
import { startOfGymDay } from "@/features/pos/day";
import { db } from "@/lib/db";
import { getGymById } from "@/lib/gym";
import { computeMetrics, type ValuePropMetrics } from "./compute";

// Reads for the value proposition metrics page (#251). Managers and owners
// only: desk staff run the desk, managers judge whether Elevate is working.
// Limited to the signed-in staff member's gym, like every query.

export const METRICS_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Managers and owners see the metrics page; desk staff don't. */
export async function canSeeMetrics(): Promise<boolean> {
  const staff = await getStaffContext();
  return !!staff && (staff.role === "MANAGER" || staff.role === "OWNER");
}

export type MetricsPageData = ValuePropMetrics & { since: Date; timeZone: string; gymName: string };

/** The last METRICS_DAYS days of metrics for the staff member's gym, or null for anyone else. */
export async function getValuePropMetrics(now = new Date()): Promise<MetricsPageData | null> {
  await connection();
  const staff = await getStaffContext();
  if (!staff || (staff.role !== "MANAGER" && staff.role !== "OWNER")) return null;
  const gym = await getGymById(staff.gymId);
  if (!gym) return null;
  const gymId = gym.id;
  const since = startOfGymDay(new Date(now.getTime() - (METRICS_DAYS - 1) * DAY_MS), gym.timeZone);

  const [attempts, scans, checkIns, newClimbers, sales, firstCheckIn] = await Promise.all([
    db.checkInAttempt.findMany({
      where: { gymId, createdAt: { gte: since } },
      select: { createdAt: true, source: true, outcome: true, reason: true, wasBlocked: true, elapsedMs: true },
    }),
    db.qrScan.findMany({
      where: { gymId, scannedAt: { gte: since } },
      select: { scannedAt: true, takenAt: true },
    }),
    db.checkIn.findMany({
      where: { gymId, checkedInAt: { gte: since } },
      select: { climberId: true, checkedInAt: true },
    }),
    db.climber.findMany({
      where: { gymId, createdAt: { gte: since } },
      select: { createdAt: true, authUserId: true },
    }),
    db.sale.findMany({
      where: { gymId, createdAt: { gte: since } },
      select: { createdAt: true, tender: true, status: true, voidedAt: true },
    }),
    db.checkIn.findFirst({
      where: { gymId },
      orderBy: { checkedInAt: "asc" },
      select: { checkedInAt: true },
    }),
  ]);

  // First ever visits that fall in the window, and each climber's first waiver.
  const visitorIds = [...new Set(checkIns.map((c) => c.climberId))];
  const firsts = visitorIds.length
    ? await db.checkIn.groupBy({
        by: ["climberId"],
        where: { gymId, climberId: { in: visitorIds } },
        _min: { checkedInAt: true },
      })
    : [];
  const newVisitors = firsts.filter((f) => f._min.checkedInAt && f._min.checkedInAt >= since);
  const waivers = newVisitors.length
    ? await db.waiver.groupBy({
        by: ["climberId"],
        where: { gymId, climberId: { in: newVisitors.map((f) => f.climberId) } },
        _min: { signedAt: true },
      })
    : [];
  const firstWaiver = new Map(waivers.map((w) => [w.climberId, w._min.signedAt ?? null]));

  const metrics = computeMetrics({
    now,
    timeZone: gym.timeZone,
    since,
    days: METRICS_DAYS,
    scanTtlMs: SCAN_TTL_MS,
    attempts,
    scans,
    checkIns,
    firstVisits: newVisitors.map((f) => ({
      firstAt: f._min.checkedInAt!,
      dayStart: startOfGymDay(f._min.checkedInAt!, gym.timeZone),
      firstWaiverAt: firstWaiver.get(f.climberId) ?? null,
    })),
    newClimbers: newClimbers.map((c) => ({ createdAt: c.createdAt, ownLogin: c.authUserId !== null })),
    sales,
    gymCreatedAt: gym.createdAt,
    firstCheckInAt: firstCheckIn?.checkedInAt ?? null,
  });
  return { ...metrics, since, timeZone: gym.timeZone, gymName: gym.name };
}
