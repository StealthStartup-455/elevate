"use server";

import { redirect } from "next/navigation";
import { DESK_USERNAME, findClimberIdByUsername } from "./mock-users";
import { logEvent } from "@/lib/log";
import { isDemoMode } from "./demo-mode";
import { clearSession, setDeskSession, setSession } from "./session";

export type LoginState = { error?: string };

// Static demo login, no real auth: the password must equal the username.
// A climber from the database goes to /me, "desk" goes to /desk.
// TODO(auth): replace with Supabase sign-in. Only works in demo mode (demo-mode.ts).
export async function mockLogin(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!isDemoMode()) {
    logEvent("login_failed", { reason: "demo_mode_off" });
    return { error: "Log in isn't available yet." };
  }

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim().toLowerCase();

  if (!username || password !== username) {
    logEvent("login_failed", { reason: "wrong_password" });
    return { error: "Unknown username or password." };
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
    return { error: "Unknown username or password." };
  }
  logEvent("login_succeeded", { role: "climber", climberId });

  await setSession(climberId);
  redirect("/me");
}

// Ends the demo session and returns to the log in page.
// TODO(auth): also sign out of Supabase once real login exists.
export async function logout(): Promise<void> {
  await clearSession();
  redirect("/");
}
