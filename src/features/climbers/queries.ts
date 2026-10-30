import { redirect } from "next/navigation";
import { connection } from "next/server";
import { usernameFor } from "@/features/auth/mock-users";
import { getCurrentUser, getSessionClimberId } from "@/features/auth/queries";
import { getDemoClimberId } from "@/features/auth/session";
import { getStaffContext, isStaff, requireStaff } from "@/features/auth/staff";
import { db } from "@/lib/db";
import { getGymById } from "@/lib/gym";
import { formatPhone } from "./phone";
import { bestMatches } from "./search";
import { hasDayPass, isoDay, summarizeMembership, summarizeWaiver } from "./status";
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
  /** A free day pass from the desk covers today (stopgap, #62). */
  hasDayPass: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Only the latest waiver and membership pass matter for the status.
// Every climber of the gym, or only `ids` when given.
function findRows(gymId: string, ids?: string[]) {
  return db.climber.findMany({
    where: { gymId, ...(ids ? { id: { in: ids } } : {}) },
    include: {
      waivers: {
        orderBy: { signedAt: "desc" },
        take: 1,
        select: { signedAt: true, version: true },
      },
      passes: {
        // Every membership: a renewal bought early has not started yet, and the
        // status comes from the one in effect today (see summarizeMembership).
        // DAY passes are the #62 stopgap. They end at midnight and pile up
        // daily, so only unexpired ones are loaded.
        where: {
          OR: [{ kind: "MEMBERSHIP" }, { kind: "DAY", expiresAt: { gt: new Date() } }],
        },
        select: { kind: true, startsAt: true, expiresAt: true, pausedAt: true },
      },
    },
  });
}

type Row = Awaited<ReturnType<typeof findRows>>[number];

function toClimber(row: Row, waiverVersion: string | null, now: Date): Climber {
  const waiver = summarizeWaiver(row.waivers[0], waiverVersion, now);
  const membership = summarizeMembership(
    row.passes.filter((p) => p.kind === "MEMBERSHIP"),
    now,
  );
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
    hasDayPass: hasDayPass(row.passes.filter((p) => p.kind === "DAY"), now),
  };
}

/**
 * The signed-in climber's membership. Reads the session (features/auth);
 * with nobody signed in, the person is sent to the log in page, so /me is only
 * ever someone's own account.
 */
export async function getMyMembership(): Promise<Membership> {
  // Per-user data: render per request, never at build time.
  await connection();
  const id = await getSessionClimberId();
  // Staff with no climber of their own belong on the desk, not at log in.
  if (!id) redirect((await isStaff()) ? "/desk" : "/");
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
    hasDayPass: climber.hasDayPass,
  };
}

// Every climber, A to Z by last name. Staff only.
export async function listClimbers(): Promise<Climber[]> {
  await connection();
  await requireStaff();
  const staff = await getStaffContext();
  if (!staff) return [];
  const gym = await getGymById(staff.gymId);
  if (!gym) return [];
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

// No staff check here: /me reads the climber's own record through this. Desk
// callers check first.
export async function getClimber(id: string): Promise<Climber | null> {
  await connection();
  // Not a UUID: no such climber, and Postgres would reject the query.
  if (!UUID.test(id)) return null;
  const staff = await getStaffContext();
  let gymId = staff?.gymId ?? null;
  if (!gymId) {
    const user = await getCurrentUser();
    if (user?.climberIds.includes(id)) {
      gymId =
        (await db.climber.findUnique({ where: { id }, select: { gymId: true } }))?.gymId ?? null;
    } else if ((await getDemoClimberId()) === id) {
      gymId =
        (await db.climber.findUnique({ where: { id }, select: { gymId: true } }))?.gymId ?? null;
    }
  }
  if (!gymId) return null;
  const gym = await getGymById(gymId);
  if (!gym) return null;
  const [row] = await findRows(gym.id, [id]);
  return row ? toClimber(row, gym.waiverVersion, new Date()) : null;
}

// What the busyness mock needs to show its check-ins as real climbers: the
// database climber (id for the link, live waiver status) by the mock's own id.
export type CheckInClimber = { id: string; waiverStatus: WaiverStatus };

// The climbers behind the desk's recent check-ins, by the keys the check-ins
// use: a database id (desk check-ins) or a seeded busyness climber's mock id
// (climber-12, kept as externalId). Only those climbers are loaded (#85).
export async function getCheckInClimbers(
  keys: string[],
): Promise<Map<string, CheckInClimber>> {
  await connection();
  await requireStaff();
  const map = new Map<string, CheckInClimber>();
  const unique = [...new Set(keys)];
  if (unique.length === 0) return map;
  const staff = await getStaffContext();
  if (!staff) return map;
  const gym = await getGymById(staff.gymId);
  if (!gym) return map;
  const now = new Date();
  const ids = unique.filter((key) => UUID.test(key));
  const externalIds = unique.filter((key) => !UUID.test(key));
  const rows = await db.climber.findMany({
    where: {
      gymId: gym.id,
      OR: [{ id: { in: ids } }, { externalId: { in: externalIds } }],
    },
    select: {
      id: true,
      externalId: true,
      waivers: { orderBy: { signedAt: "desc" }, take: 1, select: { signedAt: true, version: true } },
    },
  });
  for (const row of rows) {
    const value = {
      id: row.id,
      waiverStatus: summarizeWaiver(row.waivers[0], gym.waiverVersion, now).status,
    };
    map.set(row.id, value);
    if (row.externalId) map.set(row.externalId, value);
  }
  return map;
}

// Manual check in search (#85): the best matches for `query`, with their
// waiver and membership. Matching runs on the server over names and phones
// only (one light query), then statuses load for the few matches, so the desk
// never sends the whole climber list to the browser. Staff only.
export async function searchClimbers(query: string, limit: number): Promise<Climber[]> {
  await requireStaff();
  const q = query.trim().slice(0, 100);
  if (q === "") return [];
  // The signed-in staff member's gym, never another gym's climbers (#34).
  const staff = await getStaffContext();
  if (!staff) return [];
  const gym = await getGymById(staff.gymId);
  if (!gym) return [];
  const people = await db.climber.findMany({
    where: { gymId: gym.id },
    select: { id: true, firstName: true, lastName: true, phone: true },
  });
  const matches = bestMatches(
    people.map((p) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      phone: p.phone ? formatPhone(p.phone) : "",
    })),
    q,
    limit,
  );
  if (matches.length === 0) return [];
  const now = new Date();
  const byId = new Map(
    (await findRows(gym.id, matches.map((m) => m.id))).map((row) => [
      row.id,
      toClimber(row, gym.waiverVersion, now),
    ]),
  );
  return matches.flatMap((m) => byId.get(m.id) ?? []);
}

// Visits saved in the CheckIn table inside the active window, newest first.
// Only front desk check-ins are saved so far (see checkInClimber).
// No staff check: the busyness count on /me reads this too.
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
  const staff = await getStaffContext();
  let gymId = staff?.gymId ?? null;
  if (!gymId) {
    const user = await getCurrentUser();
    const demoClimberId = await getDemoClimberId();
    gymId =
      (user?.climberIds[0]
        ? (await db.climber.findFirst({ where: { id: user.climberIds[0] }, select: { gymId: true } }))
            ?.gymId ?? null
        : null) ??
      (demoClimberId
        ? (await db.climber.findUnique({ where: { id: demoClimberId }, select: { gymId: true } }))
            ?.gymId ?? null
        : null);
  }
  if (!gymId) return [];
  const gym = await getGymById(gymId);
  if (!gym) return [];
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
