import { cookies } from "next/headers";
import { isDemoMode } from "./demo-mode";

// The demo session: a cookie holding the signed-in climber's id. It is not
// real auth, so it is only read and written in demo mode (demo-mode.ts).
// The real Supabase login lives in queries.ts.
export const MOCK_USER_COOKIE = "elevate_mock_user";
// Every gym-scoped customer record that belongs to this demo browser session.
export const MOCK_USER_IDS_COOKIE = "elevate_mock_user_ids";
// Set by the "desk" demo login so the proxy lets staff into /desk.
export const MOCK_DESK_COOKIE = "elevate_mock_desk";
// The gym-specific customer record selected by a real login. A person can
// join more than one gym, but the climber app shows one gym at a time.
export const ACTIVE_CLIMBER_COOKIE = "elevate_active_climber";

// Stays signed in across browser restarts, so /me and the other URLs keep
// working until the person logs out.
const SESSION_DAYS = 30;
const MAX_DEMO_CLIMBERS = 20;
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production", // HTTPS only once hosted
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
} as const;

export async function setSession(climberId: string): Promise<void> {
  if (!isDemoMode()) return;
  const jar = await cookies();
  const ids = demoClimberIds(
    jar.get(MOCK_USER_IDS_COOKIE)?.value,
    jar.get(MOCK_USER_COOKIE)?.value,
  );
  const nextIds = [climberId, ...ids.filter((id) => id !== climberId)].slice(0, MAX_DEMO_CLIMBERS);
  jar.set(MOCK_USER_COOKIE, climberId, COOKIE_OPTIONS);
  jar.set(MOCK_USER_IDS_COOKIE, JSON.stringify(nextIds), COOKIE_OPTIONS);
}

export async function setActiveClimberSession(climberId: string): Promise<void> {
  (await cookies()).set(ACTIVE_CLIMBER_COOKIE, climberId, COOKIE_OPTIONS);
}

export async function setDeskSession(gymId?: string): Promise<void> {
  if (!isDemoMode()) return;
  (await cookies()).set(MOCK_DESK_COOKIE, gymId ?? "1", COOKIE_OPTIONS);
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(MOCK_USER_COOKIE);
  jar.delete(MOCK_USER_IDS_COOKIE);
  jar.delete(MOCK_DESK_COOKIE);
  jar.delete(ACTIVE_CLIMBER_COOKIE);
}

// The "desk" demo login. Use isStaff (staff.ts) instead, which also checks
// the real login.
export async function hasDemoDeskSession(): Promise<boolean> {
  if (!isDemoMode()) return false;
  return (await cookies()).has(MOCK_DESK_COOKIE);
}

export async function getDemoDeskGymId(): Promise<string | undefined> {
  if (!isDemoMode()) return undefined;
  const value = (await cookies()).get(MOCK_DESK_COOKIE)?.value;
  return value && value !== "1" ? value : undefined;
}

// Use getSessionClimberId (queries.ts) instead,
// which also checks the real login.
export async function getDemoClimberId(): Promise<string | undefined> {
  if (!isDemoMode()) return undefined;
  return (await cookies()).get(MOCK_USER_COOKIE)?.value;
}

export async function getDemoClimberIds(): Promise<string[]> {
  if (!isDemoMode()) return [];
  const jar = await cookies();
  return demoClimberIds(
    jar.get(MOCK_USER_IDS_COOKIE)?.value,
    jar.get(MOCK_USER_COOKIE)?.value,
  );
}

export async function getActiveClimberId(): Promise<string | undefined> {
  return (await cookies()).get(ACTIVE_CLIMBER_COOKIE)?.value;
}

function demoClimberIds(value: string | undefined, activeId: string | undefined): string[] {
  try {
    const stored = JSON.parse(value ?? "[]");
    const ids = Array.isArray(stored)
      ? stored.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];
    return [...new Set([activeId, ...ids].filter((id): id is string => Boolean(id)))].slice(
      0,
      MAX_DEMO_CLIMBERS,
    );
  } catch {
    return activeId ? [activeId] : [];
  }
}
