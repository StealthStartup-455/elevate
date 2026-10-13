// In-memory stand-in for the climbers table until the schema exists. Replaced
// by real queries in queries.ts and actions.ts; nothing else imports this file.
//
// Seeded from the busyness mock (same ids, names, phones and waiver status), so
// a climber opened from the desk's check-in table is the same person here.
// Dates are made up deterministically from the id, so they never change.
import { mockClimbers } from "@/features/analytics/mock-data";
import type { Climber, ClimberInput, MembershipStatus, WaiverStatus } from "./types";

function idNumber(id: string): number {
  return Number(id.replace(/\D/g, "")) || 0;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateOfBirthFor(n: number): string {
  // Every 9th climber is a child, so the under-18 case is visible.
  const year = n % 9 === 0 ? 2012 + (n % 4) : 1965 + ((n * 7) % 40);
  return `${year}-${pad(((n * 5) % 12) + 1)}-${pad(((n * 11) % 28) + 1)}`;
}

// Valid waivers run into 2027; expired ones ended earlier this year.
function waiverExpiryFor(n: number, status: Climber["waiverStatus"]): string | undefined {
  if (status === "missing") return undefined;
  const day = pad(((n * 7) % 28) + 1);
  return status === "valid"
    ? `2027-${pad(((n * 3) % 12) + 1)}-${day}`
    : `2026-${pad((n % 8) + 1)}-${day}`;
}

// Demo accounts for showing every state of the member dashboard: each waiver
// status with each membership status. They log in with their username as both
// username and password (see features/auth). Ids start at 9001 so they never
// clash with the busyness mock climbers.
export type DemoAccount = {
  id: string;
  username: string;
  waiverStatus: WaiverStatus;
  membershipStatus: MembershipStatus;
};

const WAIVERS: WaiverStatus[] = ["valid", "expired", "missing"];
const MEMBERSHIPS: MembershipStatus[] = ["none", "active", "paused", "expired"];

export const DEMO_ACCOUNTS: DemoAccount[] = WAIVERS.flatMap((waiverStatus, w) =>
  MEMBERSHIPS.map((membershipStatus, m) => ({
    id: `climber-${9001 + w * MEMBERSHIPS.length + m}`,
    username: `demo-${waiverStatus}-${membershipStatus}`,
    waiverStatus,
    membershipStatus,
  })),
);

function titleCase(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

function demoClimbers(): Climber[] {
  return DEMO_ACCOUNTS.map((d, i) => ({
    id: d.id,
    firstName: "Demo",
    lastName: `${titleCase(d.waiverStatus)}-${titleCase(d.membershipStatus)}`,
    phone: `250-555-${9001 + i}`,
    dateOfBirth: "1990-06-15",
    waiverStatus: d.waiverStatus,
    waiverExpiresOn:
      d.waiverStatus === "valid"
        ? "2027-06-30"
        : d.waiverStatus === "expired"
          ? "2026-03-31"
          : undefined,
    membershipStatus: d.membershipStatus,
  }));
}

// Kept on globalThis so dev hot reloads don't wipe edits made in the browser.
const store = globalThis as typeof globalThis & { __climbers?: Climber[] };

export function climberStore(): Climber[] {
  return (store.__climbers ??= [
    ...mockClimbers().map((c) => {
      const n = idNumber(c.id);
      return {
        ...c,
        dateOfBirth: dateOfBirthFor(n),
        waiverExpiresOn: waiverExpiryFor(n, c.waiverStatus),
      };
    }),
    ...demoClimbers(),
  ]);
}

// New climbers get ids from 5001 up. That range sits above every busyness
// scenario's climbers (they stop at 67) and below the demo accounts (9001+),
// so a new account never collides with a check-in whichever scenario is active.
const NEW_CLIMBER_ID_START = 5001;

// A new climber with the next free id (climber-N), no waiver yet.
export function addMockClimber(input: ClimberInput): Climber {
  const all = climberStore();
  const next = Math.max(
    NEW_CLIMBER_ID_START - 1,
    ...all.map((c) => idNumber(c.id)).filter((n) => n >= NEW_CLIMBER_ID_START && n < 9000),
  ) + 1;
  // New accounts have no waiver and no membership until they buy one.
  const climber: Climber = {
    id: `climber-${next}`,
    ...input,
    waiverStatus: "missing",
    membershipStatus: "none",
  };
  all.push(climber);
  return climber;
}
