// Static stand-in for real accounts until auth exists: every climber in the
// mock data can "log in" with their username as both username and password.
// Nothing here is a secret, and none of it works in a production build.
import { mockClimbers } from "@/features/analytics/mock-data";
import type { Climber } from "@/features/analytics/types";
import { DEMO_ACCOUNTS } from "@/features/climbers/mock-data";

// Staff demo login for the front desk.
export const DESK_USERNAME = "desk";

// Cookie that remembers which mock climber is "signed in".
export const MOCK_USER_COOKIE = "elevate_mock_user";

// "jordan.roy": first and last name, lowercase, no spaces.
export function usernameFor(climber: Pick<Climber, "firstName" | "lastName">): string {
  return `${climber.firstName}.${climber.lastName}`.toLowerCase().replace(/\s+/g, "");
}

// The cookie value for a username, or undefined if there is no such account.
// Demo accounts come first, then the busyness mock climbers.
export function findMockClimberIdByUsername(username: string): string | undefined {
  const wanted = username.trim().toLowerCase();
  const demo = DEMO_ACCOUNTS.find((d) => d.username === wanted);
  if (demo) return demo.id;
  return mockClimbers().find((c) => usernameFor(c) === wanted)?.id;
}
