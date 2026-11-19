import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { forgetGym } from "@/lib/gym";
import { logEvent } from "@/lib/log";
import { slugFromGymName, type GymInput } from "./validate";

// Called only after Supabase has verified the owner's email. Retried on login,
// so an interrupted signup never leaves an account permanently without a gym.
export async function provisionGym(
  authUserId: string,
  gym: GymInput,
): Promise<{ gymId: string } | { error: string }> {
  try {
    const gymId = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`gym-owner:${authUserId}`}))`;
      const owner = await tx.staff.findFirst({
        where: { authUserId },
        select: { gymId: true },
      });
      if (owner) return owner.gymId;
      const created = await tx.gym.create({
        data: { name: gym.gymName, slug: slugFromGymName(gym.gymName), timeZone: gym.timeZone },
        select: { id: true },
      });
      await tx.staff.create({
        data: { gymId: created.id, authUserId, name: gym.ownerName, role: "OWNER" },
      });
      return created.id;
    });
    forgetGym();
    logEvent("gym_created", { gymId, source: "self_service" });
    return { gymId };
  } catch (error) {
    logEvent("gym_provision_failed", {
      reason: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "database_error",
    });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        error: "Your account is ready, but that gym name is taken. Open Create your gym and try a more specific name.",
      };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError ||
        error instanceof Prisma.PrismaClientInitializationError) {
      return { error: "Your account is saved, but we couldn't set up your gym. Log in again to retry." };
    }
    throw error;
  }
}
