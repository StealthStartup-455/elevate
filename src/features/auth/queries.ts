import { cache } from "react";
import type { StaffRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getGym } from "@/lib/gym";
import { createClient } from "@/lib/supabase/server";
import { getDemoClimberId } from "./session";

// Not in session.ts on purpose: proxy.ts imports that file, and the proxy
// shouldn't pull in the database.

export type CurrentUser = {
  authUserId: string;
  staff: { id: string; name: string; role: StaffRole } | null;
  // A parent's login can manage more than one climber.
  climberIds: string[];
};

// The staff row and climbers behind a Supabase login. The login action already
// has the user from signInWithPassword, so it calls this directly.
export async function findAccount(authUserId: string): Promise<CurrentUser> {
  const gym = await getGym();
  const [staff, climbers] = await Promise.all([
    db.staff.findUnique({
      where: { gymId_authUserId: { gymId: gym.id, authUserId } },
      select: { id: true, name: true, role: true, active: true },
    }),
    db.climber.findMany({
      where: { gymId: gym.id, authUserId },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    authUserId,
    // Staff who left keep their row, so check active.
    staff: staff?.active ? { id: staff.id, name: staff.name, role: staff.role } : null,
    climberIds: climbers.map((c) => c.id),
  };
}

// getUser() checks the token with Supabase. getSession() just trusts the
// cookie, so don't use it on the server.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? findAccount(user.id) : null;
});

/** The signed-in climber's id, or undefined when nobody is signed in. */
export async function getSessionClimberId(): Promise<string | undefined> {
  // Demo cookie first so demo mode keeps working.
  const demoId = await getDemoClimberId();
  if (demoId) return demoId;
  // TODO: let parents switch between their kids.
  return (await getCurrentUser())?.climberIds[0];
}
