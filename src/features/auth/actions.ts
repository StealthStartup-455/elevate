"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  DESK_USERNAME,
  findMockClimberIdByUsername,
  MOCK_USER_COOKIE,
} from "./mock-users";

export type LoginState = { error?: string };

// Static demo login, no real auth: the password must equal the username.
// A climber from the mock data goes to /me, "desk" goes to /desk.
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

  const jar = await cookies();

  if (username === DESK_USERNAME) {
    jar.delete(MOCK_USER_COOKIE);
    redirect("/desk");
  }

  const climberId = findMockClimberIdByUsername(username);
  if (!climberId) return { error: "Unknown username or password." };

  jar.set(MOCK_USER_COOKIE, climberId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect("/me");
}

// Ends the demo session and returns to the log in page.
// TODO(auth): also sign out of Supabase once real login exists.
export async function logout(): Promise<void> {
  (await cookies()).delete(MOCK_USER_COOKIE);
  redirect("/");
}
