import { cache } from "react";
import type { StaffRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { timed } from "@/lib/timing";
import type { ClimberInput } from "@/features/climbers/types";
import { getActiveClimberId, getDemoClimberId } from "./session";

// Not in session.ts on purpose: proxy.ts imports that file, and the proxy
// shouldn't pull in the database.

export type CurrentUser = {
  authUserId: string;
  username?: string;
  customerProfile?: ClimberInput;
  staff: { id: string; name: string; role: StaffRole; gymId: string } | null;
  // A parent's login can manage more than one climber.
  climberIds: string[];
};

export type DemoStaffAccount = {
  gymId: string;
  demoPasswordHash: string;
};

export async function findDemoStaffAccount(email: string): Promise<DemoStaffAccount | null> {
  return db.staff.findFirst({
    where: { demoEmail: email, active: true },
    select: { gymId: true, demoPasswordHash: true },
  }).then((staff) =>
    staff?.demoPasswordHash
      ? { gymId: staff.gymId, demoPasswordHash: staff.demoPasswordHash }
      : null,
  );
}

export async function hasLegacyDemoGym(): Promise<boolean> {
  return !!(await db.staff.findFirst({
    where: {
      demoEmail: null,
      authUserId: { startsWith: "demo-owner-" },
    },
    select: { id: true },
  }));
}

function customerProfile(metadata: Record<string, unknown>): ClimberInput | undefined {
  const firstName = metadata.firstName;
  const lastName = metadata.lastName;
  const phone = metadata.phone;
  const email = metadata.email;
  const dateOfBirth = metadata.dateOfBirth;
  if (
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    typeof phone !== "string" ||
    typeof email !== "string" ||
    typeof dateOfBirth !== "string"
  ) {
    return undefined;
  }
  return { firstName, lastName, phone, email, dateOfBirth };
}

// The staff row and climbers behind a Supabase login. The login action already
// has the user from signInWithPassword, so it calls this directly.
export async function findAccount(authUserId: string): Promise<CurrentUser> {
  const [staff, climbers] = await Promise.all([
    db.staff.findFirst({
      where: { authUserId, active: true },
      select: { id: true, gymId: true, name: true, role: true, active: true },
      orderBy: { createdAt: "asc" },
    }),
    db.climber.findMany({
      where: { authUserId },
      select: { id: true, gymId: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    authUserId,
    staff: staff ? { id: staff.id, name: staff.name, role: staff.role, gymId: staff.gymId } : null,
    climberIds: climbers.map((c) => c.id),
  };
}

// getUser() checks the token with Supabase. getSession() just trusts the
// cookie, so don't use it on the server.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await timed("perf_auth", { where: "page" }, () => supabase.auth.getUser());
  if (!user) return null;
  const username = user.user_metadata.username;
  const profile = customerProfile(user.user_metadata);
  return {
    ...(await findAccount(user.id)),
    username: typeof username === "string" ? username : undefined,
    customerProfile: profile,
  };
});

/** The signed-in climber's id, or undefined when nobody is signed in. */
export async function getSessionClimberId(): Promise<string | undefined> {
  // Demo cookie first so demo mode keeps working.
  const demoId = await getDemoClimberId();
  if (demoId) return demoId;
  const user = await getCurrentUser();
  if (!user) return undefined;
  const activeId = await getActiveClimberId();
  if (activeId && user.climberIds.includes(activeId)) return activeId;
  return user.climberIds[0];
}
