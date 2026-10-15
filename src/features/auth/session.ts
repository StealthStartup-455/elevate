import { cookies } from "next/headers";

// The demo session: a cookie holding the signed-in climber's id. It is not
// real auth, so it is only read and written outside production.
// TODO(auth): replace with the Supabase session.
export const MOCK_USER_COOKIE = "elevate_mock_user";

// Stays signed in across browser restarts, so /me and the other URLs keep
// working until the person logs out.
const SESSION_DAYS = 30;

export async function setSession(climberId: string): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  (await cookies()).set(MOCK_USER_COOKIE, climberId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(MOCK_USER_COOKIE);
}

/** The signed-in climber's id, or undefined when nobody is signed in. */
export async function getSessionClimberId(): Promise<string | undefined> {
  if (process.env.NODE_ENV === "production") return undefined;
  return (await cookies()).get(MOCK_USER_COOKIE)?.value;
}
