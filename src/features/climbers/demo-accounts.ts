// Demo accounts for showing every state of the member dashboard: each waiver
// status with each membership status. They are real rows in the mock database
// (prisma/seed.ts creates them) and log in with their username as both
// username and password (see features/auth). Pure data, so the seed script and
// the log in card can share it.
import type { MembershipStatus, WaiverStatus } from "./types";

export type DemoAccount = {
  /** Log in name; also stored as the climber's externalId so it can be found. */
  username: string;
  waiverStatus: WaiverStatus;
  membershipStatus: MembershipStatus;
};

const WAIVERS: WaiverStatus[] = ["valid", "expired", "missing"];
const MEMBERSHIPS: MembershipStatus[] = ["none", "active", "paused", "expired"];

export const DEMO_ACCOUNTS: DemoAccount[] = WAIVERS.flatMap((waiverStatus) =>
  MEMBERSHIPS.map((membershipStatus) => ({
    username: `demo-${waiverStatus}-${membershipStatus}`,
    waiverStatus,
    membershipStatus,
  })),
);

export const DEMO_USERNAME_PREFIX = "demo-";
