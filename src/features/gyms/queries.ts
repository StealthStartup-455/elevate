import { db } from "@/lib/db";
import { getCurrentUser } from "@/features/auth/queries";
import { getDemoClimberIds } from "@/features/auth/session";

export type GymSearchResult = {
  id: string;
  name: string;
  slug: string;
  timeZone: string;
  joinedClimberId?: string;
};

export type JoinedGym = {
  climberId: string;
  name: string;
};

const MAX_RESULTS = 8;

export async function listGyms(query = ""): Promise<GymSearchResult[]> {
  const search = query.trim().slice(0, 100);
  return db.gym.findMany({
    where: {
      system: "ELEVATE",
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    select: { id: true, name: true, slug: true, timeZone: true },
    orderBy: { name: "asc" },
    take: MAX_RESULTS,
  });
}

export async function findGymBySlug(slug: string): Promise<GymSearchResult | null> {
  const value = slug.trim().toLowerCase();
  if (!value) return null;
  return db.gym.findFirst({
    where: { slug: value, system: "ELEVATE" },
    select: { id: true, name: true, slug: true, timeZone: true },
  });
}

export async function listGymsForCustomer(query = ""): Promise<GymSearchResult[]> {
  const [gyms, user, demoClimberIds] = await Promise.all([
    listGyms(query),
    getCurrentUser(),
    getDemoClimberIds(),
  ]);
  const climberIds = demoClimberIds.length > 0 ? demoClimberIds : (user?.climberIds ?? []);
  if (climberIds.length === 0) return gyms;

  const memberships = await db.climber.findMany({
    where: { id: { in: climberIds } },
    select: { id: true, gymId: true, onboardingComplete: true },
  });
  const joinedByGym = new Map(
    memberships
      .filter((climber) => climber.onboardingComplete)
      .map((climber) => [climber.gymId, climber.id]),
  );
  return gyms.map((gym) => ({ ...gym, joinedClimberId: joinedByGym.get(gym.id) }));
}

export async function listJoinedGyms(): Promise<JoinedGym[]> {
  const [user, demoClimberIds] = await Promise.all([getCurrentUser(), getDemoClimberIds()]);
  const climberIds = demoClimberIds.length > 0 ? demoClimberIds : (user?.climberIds ?? []);
  if (climberIds.length === 0) return [];
  const memberships = await db.climber.findMany({
    where: { id: { in: climberIds }, onboardingComplete: true },
    select: { id: true, gym: { select: { name: true } } },
    orderBy: { gym: { name: "asc" } },
  });
  return memberships.map((membership) => ({
    climberId: membership.id,
    name: membership.gym.name,
  }));
}
