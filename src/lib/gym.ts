import { cache } from "react";
import type { Gym } from "@/generated/prisma/client";
import { db } from "./db";

// Until auth knows which gym a user belongs to, every page uses this one.
// It is created by prisma/seed.ts.
export const DEFAULT_GYM_SLUG = "demo-gym";

// The gym row barely changes, but almost every request read it: the desk's
// scan check every 2.5 seconds made it half of that request's queries. Keep it
// for a minute per server instance (#86). A change to the gym (name, time zone,
// waiver version) shows within a minute.
export const GYM_CACHE_MS = 60_000;

// Keyed by slug or id, so the demo gym and a staff member's gym (#34) share it.
const cached = new Map<string, { gym: Gym; until: number }>();

async function loadCached(
  key: string,
  where: { slug: string } | { id: string },
  now: number,
): Promise<Gym | null> {
  const hit = cached.get(key);
  if (hit && hit.until > now) return hit.gym;
  const gym = await db.gym.findUnique({ where });
  // A missing gym isn't cached, so it shows up as soon as it's created.
  if (!gym) return null;
  const until = now + GYM_CACHE_MS;
  cached.set(`slug:${gym.slug}`, { gym, until });
  cached.set(`id:${gym.id}`, { gym, until });
  return gym;
}

// The demo gym, until every page knows which gym it's for.
export async function loadGym(now: number = Date.now()): Promise<Gym> {
  const gym = await loadCached(`slug:${DEFAULT_GYM_SLUG}`, { slug: DEFAULT_GYM_SLUG }, now);
  if (!gym) {
    throw new Error(
      `Gym "${DEFAULT_GYM_SLUG}" not found. Run \`npm run db:migrate\` and \`npm run db:seed\`.`,
    );
  }
  return gym;
}

// A gym by id, for example the signed-in staff member's gym. Null if there is
// no such gym.
export async function loadGymById(id: string, now: number = Date.now()): Promise<Gym | null> {
  return loadCached(`id:${id}`, { id }, now);
}

// Forget the cached gyms, for tests and after changing a gym row.
export function forgetGym(): void {
  cached.clear();
}

export const getGym = cache(() => loadGym());
export const getGymById = cache((id: string) => loadGymById(id));
