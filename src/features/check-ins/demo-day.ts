import type { Gym } from "@/generated/prisma/client";
import { ACTIVE_WINDOW_MINUTES } from "@/features/analytics/config";
import { demoAttendanceCount, DEMO_CHECK_IN_PREFIX } from "@/features/analytics/mock-data";
import { isDemoMode } from "@/features/auth/demo-mode";
import { db } from "@/lib/db";
import { gymDay, startOfGymDay } from "./day";
import { ensureDemoExamples } from "./demo-examples";

/**
 * Keeps the fictional demo gym's last ACTIVE_WINDOW_MINUTES filled with the
 * scenario's number of saved sample visits, so the header never drops to
 * "Quiet, 0" partway through a demo. The first read of a gym day saves a
 * starting attendance; later reads add only what's missing, as new visits up
 * to now. Saved timestamps never move, so visits still age out of the window;
 * a sample climber can come back once their last visit has. Deterministic ids
 * make simultaneous desk/member requests safe.
 */
export async function ensureDemoDay(
  gym: Pick<Gym, "id" | "slug" | "timeZone" | "waiverVersion">,
  now: Date,
): Promise<void> {
  if (!isDemoMode() || gym.slug !== "demo-gym") return;
  const target = demoAttendanceCount();
  if (!target) return;
  const prefix = `${DEMO_CHECK_IN_PREFIX}${gym.id}:${gymDay(now, gym.timeZone)}:`;
  const windowStart = now.getTime() - ACTIVE_WINDOW_MINUTES * 60_000;

  // Today's sample visits so far (not the three examples), oldest first.
  const today = await db.checkIn.findMany({
    where: { gymId: gym.id, id: { startsWith: prefix }, NOT: { id: { contains: ":example:" } } },
    orderBy: { checkedInAt: "asc" },
    select: { climberId: true, checkedInAt: true },
  });
  const recent = today.filter((v) => v.checkedInAt.getTime() > windowStart && v.checkedInAt <= now);
  const missing = target - recent.length;
  if (missing <= 0) {
    await ensureDemoExamples(gym, now, prefix);
    return;
  }

  // Only the seed's fictional busyness members; team/demo login accounts stay
  // available for the person presenting to check in themselves. Not anyone
  // already counted in the window.
  const inWindow = new Set(recent.map((v) => v.climberId));
  const climbers = (
    await db.climber.findMany({
      where: {
        gymId: gym.id,
        externalId: { startsWith: "climber-" },
        passes: { some: { kind: "MEMBERSHIP", startsAt: { lte: now }, expiresAt: { gt: now }, pausedAt: null } },
        waivers: {
          some: {
            version: gym.waiverVersion ?? undefined,
            signedAt: { gte: new Date(now.getTime() - 364 * 86_400_000), lte: now },
          },
        },
      },
      orderBy: { id: "asc" },
      select: { id: true },
    })
  )
    .filter((c) => !inWindow.has(c.id))
    .slice(0, missing);
  if (!climbers.length) {
    await ensureDemoExamples(gym, now, prefix);
    return;
  }

  // Spread the new visits from the latest saved one (or 90 minutes ago, at
  // the start of a day) up to now, never before midnight.
  const midnight = startOfGymDay(now, gym.timeZone).getTime();
  const latest = today.at(-1)?.checkedInAt.getTime() ?? -Infinity;
  const earliest = Math.min(now.getTime(), Math.max(midnight, now.getTime() - 90 * 60_000, latest + 1));
  const span = Math.max(0, now.getTime() - earliest);
  await db.checkIn.createMany({
    data: climbers.map((c, i) => ({
      // Numbered on from today's visits, so two requests at once make the same ids.
      id: `${prefix}${today.length + i}`,
      gymId: gym.id,
      climberId: c.id,
      method: "FRONT_DESK" as const,
      checkedInAt: new Date(earliest + (span * i) / climbers.length),
    })),
    skipDuplicates: true,
  });
  await ensureDemoExamples(gym, now, prefix);
}
