import { cookies } from "next/headers";
import { connection } from "next/server";
import { MOCK_USER_COOKIE } from "@/features/auth/mock-users";
import { climberStore } from "./mock-data";
import type { Climber, MembershipStatus, WaiverStatus } from "./types";

// Reads for the climbers feature. Swap the bodies for database queries once the
// schema exists; callers don't change.

export type Membership = {
  climberId: string;
  firstName: string;
  plan: string;
  status: MembershipStatus;
  // Calendar date, YYYY-MM-DD. The next renewal, or when it ended. Unset when
  // there is no membership yet.
  renewsOn?: string;
  waiverStatus: WaiverStatus;
  // Calendar date the waiver runs out (or ran out). Unset when never signed.
  waiverExpiresOn?: string;
  // Printed under the QR code for manual entry at the desk.
  memberCode: string;
};

// Mock memberships: most are active, every 7th is paused, every 10th expired,
// so each state of the dashboard can be seen.
function membershipStatusFor(n: number): MembershipStatus {
  if (n % 10 === 4) return "expired";
  if (n % 10 === 7) return "paused";
  return "active";
}

/**
 * The signed-in climber's membership.
 *
 * Mock until auth and the memberships table exist: the climber who used the
 * demo login or just joined (see features/auth), or a fixed demo member if
 * nobody did. The real version reads the user from the session.
 */
export async function getMyMembership(): Promise<Membership> {
  // Per-user data: render per request, never at build time.
  await connection();
  const all = climberStore();
  // The cookie is a demo shortcut and is never trusted in production.
  const id =
    process.env.NODE_ENV === "production"
      ? undefined
      : (await cookies()).get(MOCK_USER_COOKIE)?.value;
  const climber: Climber =
    all.find((c) => c.id === id) ??
    all.find((c) => c.id === "climber-3") ??
    all[0];

  const n = Number(climber.id.replace(/\D/g, "")) || 0;
  const status = climber.membershipStatus ?? membershipStatusFor(n);
  return {
    climberId: climber.id,
    firstName: climber.firstName,
    plan: "Monthly",
    status,
    renewsOn:
      status === "none" ? undefined : status === "expired" ? "2026-09-15" : "2026-11-01",
    waiverStatus: climber.waiverStatus,
    waiverExpiresOn: climber.waiverExpiresOn,
    memberCode: `ELV-${String(n).padStart(6, "0")}`,
  };
}

// Every climber, A to Z by last name. Staff only.
export async function listClimbers(): Promise<Climber[]> {
  await connection();
  return [...climberStore()].sort(
    (a, b) =>
      a.lastName.localeCompare(b.lastName) ||
      a.firstName.localeCompare(b.firstName),
  );
}

export async function getClimber(id: string): Promise<Climber | null> {
  await connection();
  return climberStore().find((c) => c.id === id) ?? null;
}

// Current waiver status by climber id, for views that show it next to
// data from another feature (such as the check-in table).
export async function getWaiverStatuses(): Promise<Map<string, WaiverStatus>> {
  await connection();
  return new Map(climberStore().map((c) => [c.id, c.waiverStatus]));
}
