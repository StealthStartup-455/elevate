import { connection } from "next/server";
import { climberStore } from "./mock-data";
import type { Climber, WaiverStatus } from "./types";

// Reads for the climbers feature. Swap the bodies for database queries once the
// schema exists; callers don't change.

export type Membership = {
  climberId: string;
  firstName: string;
  plan: string;
  status: "active" | "paused" | "expired";
  // Calendar date, YYYY-MM-DD.
  renewsOn: string;
  waiverStatus: WaiverStatus;
  // Printed under the QR code for manual entry at the desk.
  memberCode: string;
};

/**
 * The signed-in climber's membership.
 *
 * Mock until auth and the memberships table exist: always returns the same
 * demo member. The real version reads the user from the session.
 */
export async function getMyMembership(): Promise<Membership> {
  // Per-user data: render per request, never at build time.
  await connection();
  return {
    climberId: "climber-3",
    firstName: "Jordan",
    plan: "Monthly",
    status: "active",
    renewsOn: "2026-11-01",
    waiverStatus: "valid",
    memberCode: "ELV-000003",
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
