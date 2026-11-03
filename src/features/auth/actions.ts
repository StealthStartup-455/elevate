"use server";

import { redirect } from "next/navigation";
import { DESK_USERNAME, findClimberIdByUsername } from "./mock-users";
import { logEvent } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "./demo-mode";
import { findAccount } from "./queries";
import { clearSession, setDeskSession, setSession } from "./session";

export type LoginState = { error?: string };

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

  if (!email || !password) {
    logEvent("login_failed", { reason: "missing_fields" });
    return { error: LOGIN_ERROR };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    logEvent("login_failed", { reason: error.code ?? "supabase_error" });
    return { error: LOGIN_ERROR };
  }

  const account = await findAccount(data.user.id);
  if (!account.staff && account.climberIds.length === 0) {
    logEvent("login_failed", { reason: "no_account" });
    await supabase.auth.signOut();
    return { error: "This login isn't set up for the gym yet." };
  }

  // A leftover demo cookie would win over the real login (getSessionClimberId).
  await clearSession();

  if (account.staff) {
    logEvent("login_succeeded", { role: "desk", staffId: account.staff.id });
    redirect("/desk");
  }
  logEvent("login_succeeded", { role: "climber", climberId: account.climberIds[0] });
  redirect("/me");
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
