import type { Gym } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { endOfGymDay } from "@/features/climbers/status";
import { startOfGymDay } from "./day";

/** Display fixtures only. This never changes the rules for real check-ins. */
export async function ensureDemoExamples(
  gym: Pick<Gym, "id" | "timeZone" | "waiverVersion">,
  now: Date,
  prefix: string,
): Promise<void> {
  const marker = `${prefix}example:expired-waiver`;
  if (await db.checkIn.findUnique({ where: { id: marker }, select: { id: true } })) return;
  await db.$transaction(async (tx) => {
    for (const [i, example] of ["employee", "day-pass", "expired-waiver"].entries()) {
      const externalId = `demo-attendance-${example}`;
      const lastName = ["Employee", "Day pass", "Expired waiver"][i];
      await tx.climber.createMany({
        data: [{ gymId: gym.id, externalId, firstName: "Demo", lastName, dateOfBirth: new Date("1995-01-01") }],
        skipDuplicates: true,
      });
      const climber = await tx.climber.findUniqueOrThrow({
        where: { gymId_externalId: { gymId: gym.id, externalId } },
      });
      const id = `${prefix}example:${example}`;
      const checkedInAt = new Date(Math.max(startOfGymDay(now, gym.timeZone).getTime(), now.getTime() - (i + 1) * 60_000));
      await tx.pass.createMany({
        data: [{
          id: `${id}:pass`, gymId: gym.id, climberId: climber.id,
          kind: example === "day-pass" ? "DAY" : "MEMBERSHIP",
          startsAt: startOfGymDay(now, gym.timeZone), expiresAt: endOfGymDay(now, gym.timeZone),
        }],
        skipDuplicates: true,
      });
      await tx.waiver.createMany({
        data: [{
          id: `${id}:waiver`, gymId: gym.id, climberId: climber.id,
          version: gym.waiverVersion ?? "v1", signedByName: `Demo ${lastName}`,
          signedAt: new Date(now.getTime() - (example === "expired-waiver" ? 370 : 1) * 86_400_000),
        }],
        skipDuplicates: true,
      });
      await tx.checkIn.createMany({
        data: [{ id, gymId: gym.id, climberId: climber.id, method: "FRONT_DESK", checkedInAt }],
        skipDuplicates: true,
      });
    }
  });
}
