"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { type SignupState } from "@/features/auth/actions";
import { isDemoMode } from "@/features/auth/demo-mode";
import { hashDemoPassword } from "@/features/auth/demo-credentials";
import { getCurrentUser } from "@/features/auth/queries";
import {
  clearSession,
  getDemoClimberId,
  getDemoClimberIds,
  setActiveClimberSession,
  setDeskSession,
  setSession,
} from "@/features/auth/session";
import { storedStudentId } from "@/features/climbers/student-id";
import { toStoredPhone } from "@/features/climbers/phone";
import { db } from "@/lib/db";
import { forgetGym } from "@/lib/gym";
import { logEvent } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";
import { findGymBySlug, listGymsForCustomer, type GymSearchResult } from "./queries";
import { parseGymSignup, slugFromGymName, type GymInput } from "./validate";
import { provisionGym } from "./provision";

export async function signUpGym(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const { gym, email, password, errors, values } = parseGymSignup(formData);
  if (!gym || Object.keys(errors).length > 0) {
    return { error: "Check the highlighted fields.", errors, values };
  }
  if (isDemoMode()) return { ...await demoGymSignup(gym, email, password), values };

  const supabase = await createClient();
  const { data: current } = await supabase.auth.getUser();
  let owner = current.user;
  if (owner && owner.email?.toLowerCase() !== email) {
    return { error: "You're already logged in with a different email. Log out before creating another account.", values };
  }
  if (!owner) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { pendingGym: gym } },
    });
    if (error || !data.user) {
      logEvent("gym_signup_failed", { reason: error?.code ?? "supabase_error" });
      return { error: "We couldn't create your account. Try a different email address.", values };
    }
    if (data.user.identities?.length === 0) {
      logEvent("gym_signup_failed", { reason: "existing_account" });
      return { error: "An account with that email already exists. Log in instead.", values };
    }
    owner = data.session ? data.user : null;
  }
  await clearSession();
  if (!owner?.email_confirmed_at) {
    return { success: "Check your email to confirm your account, then log in to set up your gym." };
  }
  if (current.user) {
    const { error } = await supabase.auth.updateUser({ data: { pendingGym: gym } });
    if (error) {
      logEvent("gym_signup_failed", { reason: error.code ?? "supabase_error" });
      return { error: "We couldn't save your gym setup. Try again.", values };
    }
  }
  const result = await provisionGym(owner.id, gym);
  if ("error" in result) return { ...result, values };
  revalidatePath("/me/explore");
  redirect("/desk");
}

async function demoGymSignup(
  gym: GymInput,
  email: string,
  password: string,
): Promise<SignupState> {
  const slug = slugFromGymName(gym.gymName);
  const [existingGym, existingOwner] = await Promise.all([
    findGymBySlug(slug),
    db.staff.findFirst({
      where: { demoEmail: email },
      select: { id: true },
    }),
  ]);
  if (existingOwner) {
    return { error: "An account with that email already exists. Log in instead." };
  }
  if (existingGym) {
    return { error: "A gym with that name already exists. Use a more specific name." };
  }
  const passwordHash = await hashDemoPassword(password);
  let owner;
  try {
    owner = await db.$transaction(async (tx) => {
      const newGym = await tx.gym.create({
        data: { name: gym.gymName, slug, timeZone: gym.timeZone },
        select: { id: true },
      });
      return tx.staff.create({
        data: {
          gymId: newGym.id,
          authUserId: `demo-owner-${randomUUID()}`,
          demoEmail: email,
          demoPasswordHash: passwordHash,
          name: gym.ownerName,
          role: "OWNER",
        },
        select: { id: true, gymId: true },
      });
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    logEvent("gym_signup_failed", { reason: "duplicate_gym_or_email" });
    return { error: "That gym name or email is already in use. Log in or choose another." };
  }
  forgetGym();
  await clearSession();
  await setDeskSession({ id: owner.id, demoPasswordHash: passwordHash });
  revalidatePath("/me/explore");
  logEvent("gym_created", { gymId: owner.gymId, source: "demo_self_service" });
  redirect("/desk");
}

export async function searchGyms(query: string): Promise<GymSearchResult[]> {
  return listGymsForCustomer(String(query ?? ""));
}

export async function joinGym(slug: string, _formData: FormData): Promise<void> {
  void _formData;
  const gym = await findGymBySlug(slug);
  if (!gym) redirect("/me/explore");
  const demoClimberId = await getDemoClimberId();
  if (demoClimberId) {
    const source = await db.climber.findUnique({
      where: { id: demoClimberId },
      select: {
        id: true,
        gymId: true,
        firstName: true,
        lastName: true,
        studentId: true,
        phone: true,
        email: true,
        dateOfBirth: true,
        authUserId: true,
      },
    });
    if (!source) redirect("/me/explore");
    const authUserId = source.authUserId ?? `demo-customer-${source.id}`;
    const rememberedIds = await getDemoClimberIds();
    const climber = await db.$transaction(async (tx) => {
      // Serialize joins to this gym without a uniqueness rule that would
      // prevent a parent's login from managing multiple children.
      await tx.$queryRaw`SELECT "id" FROM "Gym" WHERE "id" = ${gym.id} FOR UPDATE`;
      if (!source.authUserId) {
        await tx.climber.update({ where: { id: source.id }, data: { authUserId } });
      }
      const existing = await tx.climber.findFirst({
        where: {
          gymId: gym.id,
          OR: [{ authUserId }, { id: { in: rememberedIds }, authUserId: null }],
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true },
      });
      return existing
        ? tx.climber.update({
            where: { id: existing.id },
            data: { authUserId, onboardingComplete: true },
            select: { id: true },
          })
        : tx.climber.create({
            data: {
              gymId: gym.id,
              authUserId,
              firstName: source.firstName,
              lastName: source.lastName,
              studentId: source.studentId,
              phone: source.phone,
              email: source.email,
              dateOfBirth: source.dateOfBirth,
            },
            select: { id: true },
          });
    }).catch(studentIdConflict);
    if ("error" in climber) studentIdTaken(gym.id);
    await setSession(climber.id);
    revalidatePath("/me", "layout");
    logEvent("gym_joined", { gymId: gym.id, climberId: climber.id, source: "demo" });
    redirect("/me/register");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = user.customerProfile;
  const climber = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Gym" WHERE "id" = ${gym.id} FOR UPDATE`;
    const existing = await tx.climber.findFirst({
      where: { gymId: gym.id, authUserId: user.authUserId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    if (existing) return existing;
    if (!profile) return null;
    return tx.climber.create({
      data: {
        gymId: gym.id,
        authUserId: user.authUserId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        studentId: storedStudentId(profile.studentId),
        phone: toStoredPhone(profile.phone),
        email: profile.email || null,
        dateOfBirth: new Date(`${profile.dateOfBirth}T00:00:00Z`),
      },
      select: { id: true },
    });
  }).catch(studentIdConflict);
  if (!climber) redirect("/me/profile");
  if ("error" in climber) studentIdTaken(gym.id);

  await setActiveClimberSession(climber.id);
  revalidatePath("/me", "layout");
  logEvent("gym_joined", { gymId: gym.id, climberId: climber.id });
  redirect("/me/register");
}

function studentIdConflict(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
  return { error: "student-id-taken" } as const;
}

function studentIdTaken(gymId: string): never {
  logEvent("gym_join_failed", { gymId, reason: "student_id_taken" });
  redirect("/me/explore?error=student-id-taken");
}

export async function openJoinedGym(climberId: string, _formData: FormData): Promise<void> {
  void _formData;
  await switchGym(climberId);
}

export async function switchGym(climberId: string): Promise<void> {
  const demoClimberId = await getDemoClimberId();
  if (demoClimberId === climberId || (await getDemoClimberIds()).includes(climberId)) {
    await setSession(climberId);
    redirect("/me");
  }

  const user = await getCurrentUser();
  if (!user?.climberIds.includes(climberId)) redirect("/me/explore");
  await setActiveClimberSession(climberId);
  redirect("/me");
}
