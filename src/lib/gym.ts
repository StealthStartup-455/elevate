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

let cached: { gym: Gym; until: number } | undefined;

export async function loadGym(now: number = Date.now()): Promise<Gym> {
  if (cached && cached.until > now) return cached.gym;
  const gym = await db.gym.findUnique({ where: { slug: DEFAULT_GYM_SLUG } });
  if (!gym) {
    throw new Error(
      `Gym "${DEFAULT_GYM_SLUG}" not found. Run \`npm run db:migrate\` and \`npm run db:seed\`.`,
    );
  }
  cached = { gym, until: now + GYM_CACHE_MS };
  return gym;
}

// Forget the cached gym, for tests and after changing the gym row.
export function forgetGym(): void {
  cached = undefined;
}

export const getGym = cache(() => loadGym());
