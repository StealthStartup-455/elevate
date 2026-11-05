"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getGym } from "@/lib/gym";
import { DESK_USERNAME, findClimberIdByUsername } from "./mock-users";
import { logEvent } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "./demo-mode";
import { verifyDemoPassword } from "./demo-credentials";
import { findAccount, findDemoStaffAccount, hasLegacyDemoGym } from "./queries";
import { parseCustomerSignup, type CustomerSignup } from "./signup";
import {
  clearSession,
  setActiveClimberSession,
  setDeskSession,
  setSession,
} from "./session";

export type LoginState = { error?: string };
export type SignupState = { error?: string; success?: string };

// Same message for a wrong email and a wrong password, so nobody can use the
// form to find out who has an account.
const LOGIN_ERROR = "Unknown email or password.";

// Email and password through Supabase. Staff go to /desk, climbers to /me.
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  // Demo usernames have no "@".
  if (isDemoMode() && !email.includes("@")) return demoLogin(email, password);
  if (isDemoMode()) {
    const demoStaff = await findDemoStaffAccount(email);
    if (demoStaff) {
      if (!(await verifyDemoPassword(password, demoStaff.demoPasswordHash))) {
        logEvent("login_failed", { reason: "wrong_password" });
        return { error: LOGIN_ERROR };
      }
      await clearSession();
      await setDeskSession(demoStaff.gymId);
      logEvent("login_succeeded", { role: "desk", gymId: demoStaff.gymId, source: "demo_owner" });
      redirect("/desk");
    }
  }

  if (!email || !password) {
    logEvent("login_failed", { reason: "missing_fields" });
    return { error: LOGIN_ERROR };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    logEvent("login_failed", { reason: error.code ?? "supabase_error" });
    if (isDemoMode() && (await hasLegacyDemoGym())) {
      return {
        error:
          "To restore a gym made before owner logins, choose I manage a gym and submit its existing name with the email and password you want to use.",
      };
    }
    return { error: LOGIN_ERROR };
  }

  const account = await findAccount(data.user.id);
  // A leftover demo cookie would win over the real login (getSessionClimberId).
  await clearSession();

  if (account.staff) {
    logEvent("login_succeeded", { role: "desk", staffId: account.staff.id });
    redirect("/desk");
  }
  if (account.climberIds.length === 0) {
    logEvent("login_succeeded", { role: "customer_without_gym" });
    redirect("/me/explore");
  }
  await setActiveClimberSession(account.climberIds[0]);
  logEvent("login_succeeded", { role: "climber", climberId: account.climberIds[0] });
  redirect("/me");
}

export async function signUpCustomer(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const signup = parseCustomerSignup(formData);
  if (!signup) {
    return {
      error: "Complete every field.",
    };
  }
  if (isDemoMode()) return demoCustomerSignup(signup);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: signup.email,
    password: signup.password,
    options: {
      data: {
        firstName: signup.profile.firstName,
        lastName: signup.profile.lastName,
        phone: signup.profile.phone,
        email: signup.profile.email,
        dateOfBirth: signup.profile.dateOfBirth,
      },
    },
  });
  if (error || !data.user) {
    logEvent("signup_failed", { kind: "customer", reason: error?.code ?? "supabase_error" });
    return { error: "We couldn't create your account. Try a different email address." };
  }
  // A prior demo login otherwise wins over the new Supabase session in
  // getSessionClimberId(), sending the person back to the demo gym.
  await clearSession();
  if (!data.session) {
    return { success: "Check your email to confirm your account, then log in to find your gym." };
  }
  logEvent("signup_succeeded", { kind: "customer" });
  redirect("/me/explore");
}

async function demoCustomerSignup(signup: CustomerSignup): Promise<SignupState> {
  const gym = await getGym();
  const climber = await db.climber.create({
    data: {
      gymId: gym.id,
      firstName: signup.profile.firstName,
      lastName: signup.profile.lastName,
      phone: signup.profile.phone,
      email: signup.email,
      dateOfBirth: new Date(`${signup.profile.dateOfBirth}T00:00:00Z`),
      onboardingComplete: false,
    },
    select: { id: true },
  });
  await clearSession();
  await setSession(climber.id);
  logEvent("signup_succeeded", { kind: "customer", source: "demo", climberId: climber.id });
  redirect("/me/explore");
}

// Static demo login, no real auth: the password must equal the username.
// A climber from the database goes to /me, "desk" goes to /desk.
async function demoLogin(username: string, rawPassword: string): Promise<LoginState> {
  const password = rawPassword.trim().toLowerCase();

  if (!username || password !== username) {
    logEvent("login_failed", { reason: "wrong_password" });
    return { error: LOGIN_ERROR };
  }

  if (username === DESK_USERNAME) {
    logEvent("login_succeeded", { role: "desk" });
    await clearSession();
    await setDeskSession();
    redirect("/desk");
  }

  const climberId = await findClimberIdByUsername(username);
  if (!climberId) {
    logEvent("login_failed", { reason: "unknown_user" });
    return { error: LOGIN_ERROR };
  }
  logEvent("login_succeeded", { role: "climber", climberId });

  // Drop a leftover desk cookie too, or this browser keeps desk access (#142).
  await clearSession();
  await setSession(climberId);
  redirect("/me");
}

// Ends both the demo session and the Supabase one, then back to log in.
export async function logout(): Promise<void> {
  await clearSession();
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
