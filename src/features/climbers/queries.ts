import { redirect } from "next/navigation";
import { connection } from "next/server";
import { usernameFor } from "@/features/auth/mock-users";
import { getSessionClimberId } from "@/features/auth/session";
import { db } from "@/lib/db";
import { getGym } from "@/lib/gym";
import { formatPhone } from "./phone";
import { isoDay, summarizeMembership, summarizeWaiver } from "./status";
import type { Climber, MembershipStatus, WaiverStatus } from "./types";

// Reads for the climbers feature, from the Climber, Waiver and Pass tables.
// Every query is limited to the gym (see prisma/DATABASE.md, "Gym isolation").

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Only the latest waiver and membership pass matter for the status.
function findRows(gymId: string, id?: string) {
  return db.climber.findMany({
    where: { gymId, ...(id ? { id } : {}) },
    include: {
      waivers: {
        orderBy: { signedAt: "desc" },
        take: 1,
        select: { signedAt: true, version: true },
      },
      passes: {
        where: { kind: "MEMBERSHIP" },
        orderBy: { startsAt: "desc" },
        take: 1,
        select: { startsAt: true, expiresAt: true, pausedAt: true },
      },
    },
  });
}

type Row = Awaited<ReturnType<typeof findRows>>[number];

function toClimber(row: Row, waiverVersion: string | null, now: Date): Climber {
  const waiver = summarizeWaiver(row.waivers[0], waiverVersion, now);
  const membership = summarizeMembership(row.passes[0], now);
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone ? formatPhone(row.phone) : "",
    email: row.email ?? "",
    dateOfBirth: isoDay(row.dateOfBirth),
    username: usernameFor(row),
    waiverStatus: waiver.status,
    waiverExpiresOn: waiver.expiresOn,
    membershipStatus: membership.status,
    membershipRenewsOn: membership.renewsOn,
  };
}

/**
 * The signed-in climber's membership. Reads the demo session (features/auth);
 * with nobody signed in, the person is sent to the log in page, so /me is only
 * ever someone's own account.
 */
export async function getMyMembership(): Promise<Membership> {
  // Per-user data: render per request, never at build time.
  await connection();
  const id = await getSessionClimberId();
  if (!id) redirect("/");
  const climber = await getClimber(id);
  // A session for a climber that no longer exists (for example after the
  // database was reseeded): back to log in.
  if (!climber) redirect("/");

  return {
    climberId: climber.id,
    firstName: climber.firstName,
    plan: "Monthly",
    status: climber.membershipStatus,
    renewsOn: climber.membershipRenewsOn,
    waiverStatus: climber.waiverStatus,
    waiverExpiresOn: climber.waiverExpiresOn,
    // Printed code until real member numbers exist.
    memberCode: `ELV-${climber.id.slice(0, 6).toUpperCase()}`,
  };
}

// Every climber, A to Z by last name. Staff only.
export async function listClimbers(): Promise<Climber[]> {
  await connection();
  const gym = await getGym();
  const now = new Date();
  const rows = await findRows(gym.id);
  return rows
    .map((row) => toClimber(row, gym.waiverVersion, now))
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName) ||
        a.firstName.localeCompare(b.firstName),
    );
}

export async function getClimber(id: string): Promise<Climber | null> {
  await connection();
  // Not a UUID: no such climber, and Postgres would reject the query.
  if (!UUID.test(id)) return null;
  const gym = await getGym();
  const [row] = await findRows(gym.id, id);
  return row ? toClimber(row, gym.waiverVersion, new Date()) : null;
}

// What the busyness mock needs to show its check-ins as real climbers: the
// database climber (id for the link, live waiver status) by the mock's own id.
export type CheckInClimber = { id: string; waiverStatus: WaiverStatus };

export async function getCheckInClimbers(): Promise<Map<string, CheckInClimber>> {
  await connection();
  const gym = await getGym();
  const now = new Date();
  const rows = await findRows(gym.id);
  const map = new Map<string, CheckInClimber>();
  for (const row of rows) {
    // Seeded busyness climbers keep the mock's id (climber-12) as externalId.
    if (!row.externalId?.startsWith("climber-")) continue;
    const value = {
      id: row.id,
      waiverStatus: summarizeWaiver(row.waivers[0], gym.waiverVersion, now).status,
    };
    map.set(row.externalId, value);
    // Check-ins saved by the desk refer to the climber by database id.
    map.set(row.id, value);
  }
  return map;
}

// Visits saved in the CheckIn table inside the active window, newest first.
// Only front desk check-ins are saved so far (see checkInClimber).
export async function getSavedCheckIns(since: Date): Promise<
  {
    id: string;
    climberId: string;
    firstName: string;
    lastName: string;
    phone: string;
    timestamp: Date;
    waiverStatus: WaiverStatus;
  }[]
> {
  await connection();
  const gym = await getGym();
  const now = new Date();
  const rows = await db.checkIn.findMany({
    where: { gymId: gym.id, checkedInAt: { gt: since } },
    orderBy: { checkedInAt: "desc" },
    include: {
      climber: {
        include: {
          waivers: {
            orderBy: { signedAt: "desc" },
            take: 1,
            select: { signedAt: true, version: true },
          },
        },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    climberId: r.climberId,
    firstName: r.climber.firstName,
    lastName: r.climber.lastName,
    phone: r.climber.phone ? formatPhone(r.climber.phone) : "",
    timestamp: r.checkedInAt,
    waiverStatus: summarizeWaiver(r.climber.waivers[0], gym.waiverVersion, now).status,
  }));
}
