"use server";

import { redirect } from "next/navigation";
import { DESK_USERNAME, findClimberIdByUsername } from "./mock-users";
import { clearSession, setSession } from "./session";

export type LoginState = { error?: string };

// Static demo login, no real auth: the password must equal the username.
// A climber from the database goes to /me, "desk" goes to /desk.
// TODO(auth): replace with Supabase sign-in; this never runs in production.
export async function mockLogin(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (process.env.NODE_ENV === "production") {
    return { error: "Log in isn't available yet." };
  }

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim().toLowerCase();

  if (!username || password !== username) {
    return { error: "Unknown username or password." };
  }

  if (username === DESK_USERNAME) {
    await clearSession();
    redirect("/desk");
  }

  const climberId = await findClimberIdByUsername(username);
  if (!climberId) return { error: "Unknown username or password." };

  await setSession(climberId);
  redirect("/me");
}

// Ends the demo session and returns to the log in page.
// TODO(auth): also sign out of Supabase once real login exists.
export async function logout(): Promise<void> {
  await clearSession();
  redirect("/");
}
