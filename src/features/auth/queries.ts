import { cache } from "react";
import type { StaffRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { timed } from "@/lib/timing";
import type { ClimberInput } from "@/features/climbers/types";
import { parseClimberInput } from "@/features/climbers/validate";
import { verifyDemoDeskSession } from "./demo-credentials";
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
  id: string;
  gymId: string;
  demoPasswordHash: string;
};

export async function findDemoStaffAccount(email: string): Promise<DemoStaffAccount | null> {
  return db.staff.findFirst({
    where: { demoEmail: email, active: true },
    select: { id: true, gymId: true, demoPasswordHash: true },
  }).then((staff) =>
    staff?.demoPasswordHash
      ? { id: staff.id, gymId: staff.gymId, demoPasswordHash: staff.demoPasswordHash }
      : null,
  );
}

export async function findDemoStaffSession(token: string | undefined) {
  if (!token || !token.includes(".")) return null;
  const staff = await db.staff.findFirst({
    where: { id: token.split(".")[0], active: true, demoPasswordHash: { not: null } },
    select: { id: true, gymId: true, role: true, demoPasswordHash: true },
  });
  if (!staff?.demoPasswordHash || !verifyDemoDeskSession(token, staff.demoPasswordHash)) return null;
  return { id: staff.id, gymId: staff.gymId, role: staff.role };
}

function customerProfile(metadata: Record<string, unknown>): ClimberInput | undefined {
  const firstName = metadata.firstName;
  const lastName = metadata.lastName;
  const studentId = metadata.studentId;
  const phone = metadata.phone;
  const email = metadata.email;
  const dateOfBirth = metadata.dateOfBirth;
  if (
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    typeof studentId !== "string" ||
    typeof phone !== "string" ||
    typeof email !== "string" ||
    typeof dateOfBirth !== "string"
  ) {
    return undefined;
  }
  const form = new FormData();
  for (const [key, value] of Object.entries({ firstName, lastName, studentId, phone, email, dateOfBirth })) {
    form.set(key, value);
  }
  const parsed = parseClimberInput(form);
  return parsed.ok ? parsed.value : undefined;
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
  let profile = customerProfile(user.user_metadata);
  if (!profile) {
    const climber = await db.climber.findFirst({
      where: { authUserId: user.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { firstName: true, lastName: true, studentId: true, phone: true, email: true, dateOfBirth: true },
    });
    if (climber) {
      profile = customerProfile({
        ...climber,
        phone: climber.phone ?? "",
        email: climber.email ?? "",
        dateOfBirth: climber.dateOfBirth.toISOString().slice(0, 10),
      });
    }
  }
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
