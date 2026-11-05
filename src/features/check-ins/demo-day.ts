import type { Gym } from "@/generated/prisma/client";
import { demoAttendanceCount, DEMO_CHECK_IN_PREFIX } from "@/features/analytics/mock-data";
import { isDemoMode } from "@/features/auth/demo-mode";
import { db } from "@/lib/db";
import { gymDay, startOfGymDay } from "./day";

/** Once per gym day, give the fictional demo gym a saved starting attendance.
 * Deterministic ids make simultaneous desk/member requests safe. Never move
 * these timestamps on refresh: visits age out normally during the demo.
 */
export async function ensureDemoDay(
  gym: Pick<Gym, "id" | "slug" | "timeZone" | "waiverVersion">,
  now: Date,
): Promise<void> {
  if (!isDemoMode() || gym.slug !== "demo-gym") return;
  const count = demoAttendanceCount();
  if (!count) return;
  const prefix = `${DEMO_CHECK_IN_PREFIX}${gym.id}:${gymDay(now, gym.timeZone)}:`;
  if (await db.checkIn.findFirst({ where: { gymId: gym.id, id: { startsWith: prefix } }, select: { id: true } })) return;

  // Only the seed's fictional busyness members; team/demo login accounts stay
  // available for the person presenting to check in themselves.
  const climbers = await db.climber.findMany({
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
    take: count,
    select: { id: true },
  });
  if (!climbers.length) return;
  const midnight = startOfGymDay(now, gym.timeZone).getTime();
  const earliest = Math.max(midnight, now.getTime() - 90 * 60_000);
  await db.checkIn.createMany({
    data: climbers.map((c, i) => ({
      id: `${prefix}${i}`,
      gymId: gym.id,
      climberId: c.id,
      method: "FRONT_DESK" as const,
      checkedInAt: new Date(earliest + ((now.getTime() - earliest) * i) / climbers.length),
    })),
    skipDuplicates: true,
  });
}
