"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
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
import { toStoredPhone } from "@/features/climbers/phone";
import { db } from "@/lib/db";
import { forgetGym } from "@/lib/gym";
import { logEvent } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";
import { findGymBySlug, listGymsForCustomer, type GymSearchResult } from "./queries";
import { parseGymInput, slugFromGymName, type GymInput } from "./validate";

export async function signUpGym(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const gym = parseGymInput(formData);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!gym || !email || !password) {
    return { error: "Complete every field." };
  }
  if (isDemoMode()) return demoGymSignup(gym, email, password);

  const slug = slugFromGymName(gym.gymName);
  if (await findGymBySlug(slug)) {
    return { error: "A gym with that name already exists. Use a more specific name." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    logEvent("gym_signup_failed", { reason: error?.code ?? "supabase_error" });
    return { error: "We couldn't create your account. Try a different email address." };
  }
  if (data.user.identities?.length === 0) {
    logEvent("gym_signup_failed", { reason: "existing_account" });
    return { error: "An account with that email already exists. Log in instead." };
  }
  const authUser = data.user;
  await clearSession();

  const created = await db.$transaction(async (tx) => {
    const newGym = await tx.gym.create({
      data: { name: gym.gymName, slug, timeZone: gym.timeZone },
      select: { id: true },
    });
    await tx.staff.create({
      data: {
        gymId: newGym.id,
        authUserId: authUser.id,
        name: gym.ownerName,
        role: "OWNER",
      },
    });
    return newGym;
  });
  forgetGym();
  revalidatePath("/me/explore");
  logEvent("gym_created", { gymId: created.id, source: "self_service" });

  if (!data.session) {
    return { success: "Check your email to confirm your account, then log in to set up your gym." };
  }
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
  const passwordHash = await hashDemoPassword(password);
  if (existingGym) {
    const legacyOwner = await db.staff.findFirst({
      where: {
        gymId: existingGym.id,
        demoEmail: null,
        authUserId: { startsWith: "demo-owner-" },
      },
      select: { id: true },
    });
    if (!legacyOwner) {
      return { error: "A gym with that name already exists. Use a more specific name." };
    }
    await db.staff.update({
      where: { id: legacyOwner.id },
      data: {
        demoEmail: email,
        demoPasswordHash: passwordHash,
        name: gym.ownerName,
      },
    });
    await clearSession();
    await setDeskSession(existingGym.id);
    logEvent("gym_owner_reclaimed", { gymId: existingGym.id, source: "demo_self_service" });
    redirect("/desk");
  }
  const created = await db.$transaction(async (tx) => {
    const newGym = await tx.gym.create({
      data: { name: gym.gymName, slug, timeZone: gym.timeZone },
      select: { id: true },
    });
    await tx.staff.create({
      data: {
        gymId: newGym.id,
        authUserId: `demo-owner-${randomUUID()}`,
        demoEmail: email,
        demoPasswordHash: passwordHash,
        name: gym.ownerName,
        role: "OWNER",
      },
    });
    return newGym;
  });
  forgetGym();
  await clearSession();
  await setDeskSession(created.id);
  revalidatePath("/me/explore");
  logEvent("gym_created", { gymId: created.id, source: "demo_self_service" });
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
        phone: true,
        email: true,
        dateOfBirth: true,
      },
    });
    if (!source) redirect("/me/explore");
    const climber =
      source.gymId === gym.id
        ? await db.climber.update({
            where: { id: source.id },
            data: { onboardingComplete: true },
            select: { id: true },
          })
        : await db.climber.create({
            data: {
              gymId: gym.id,
              firstName: source.firstName,
              lastName: source.lastName,
              phone: source.phone,
              email: source.email,
              dateOfBirth: source.dateOfBirth,
            },
            select: { id: true },
          });
    await setSession(climber.id);
    revalidatePath("/me", "layout");
    logEvent("gym_joined", { gymId: gym.id, climberId: climber.id, source: "demo" });
    redirect("/me/register");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.customerProfile) redirect("/me/explore");

  const existing = await db.climber.findFirst({
    where: { gymId: gym.id, authUserId: user.authUserId },
    select: { id: true },
  });
  const climber =
    existing ??
    (await db.climber.create({
      data: {
        gymId: gym.id,
        authUserId: user.authUserId,
        firstName: user.customerProfile.firstName,
        lastName: user.customerProfile.lastName,
        phone: toStoredPhone(user.customerProfile.phone),
        email: user.customerProfile.email || null,
        dateOfBirth: new Date(`${user.customerProfile.dateOfBirth}T00:00:00Z`),
      },
      select: { id: true },
    }));

  await setActiveClimberSession(climber.id);
  revalidatePath("/me", "layout");
  logEvent("gym_joined", { gymId: gym.id, climberId: climber.id });
  redirect("/me/register");
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
