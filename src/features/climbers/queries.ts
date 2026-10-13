import { connection } from "next/server";
import type { WaiverStatus } from "@/features/analytics/types";

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
