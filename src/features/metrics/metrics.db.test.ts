// Needs a Postgres database with the migrations applied (DATABASE_URL).
// Run with `npm run test:db`; CI runs it against its own database.
// The value proposition metrics (#251): every outcome at the desk is saved as
// a CheckInAttempt, and the metrics page reads them for managers only.
import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { randomStudentId } from "@/features/climbers/student-id";

const SLUG = "test-metrics";
const auth = vi.hoisted(() => ({ role: "MANAGER" as "DESK" | "MANAGER", gymId: "" }));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));
vi.mock("@/features/auth/staff", () => ({
  isStaff: async () => true,
  getStaffContext: async () => ({ id: null, gymId: auth.gymId, role: auth.role }),
  requireStaff: async () => {},
}));
vi.mock("@/features/auth/queries", () => ({
  getCurrentUser: async () => null,
  getSessionClimberId: async () => null,
}));
vi.mock("@/features/auth/session", () => ({ setSession: vi.fn() }));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn(), logWarning: vi.fn() }));
vi.mock("@/lib/gym", () => ({
  getGym: async () => db.gym.findUniqueOrThrow({ where: { slug: SLUG } }),
  getGymById: async (id: string) => db.gym.findUnique({ where: { id } }),
}));

const { checkInClimber } = await import("@/features/climbers/actions");
const { recordCheckInGaveUp } = await import("./actions");
const { getValuePropMetrics } = await import("./queries");

let gymId = "";

beforeAll(async () => {
  await cleanUp();
  gymId = (await db.gym.create({ data: { name: "Metrics test gym", slug: SLUG } })).id;
  auth.gymId = gymId;
});

beforeEach(async () => {
  auth.role = "MANAGER";
  await db.checkInAttempt.deleteMany({ where: { gymId } });
});

afterAll(async () => {
  await cleanUp();
  await db.$disconnect();
});

async function cleanUp() {
  const gym = await db.gym.findUnique({ where: { slug: SLUG } });
  if (!gym) return;
  const where = { where: { gymId: gym.id } };
  await db.checkIn.deleteMany(where);
  await db.pass.deleteMany(where);
  await db.waiver.deleteMany(where);
  await db.climber.deleteMany(where);
  // CheckInAttempt rows go with the gym (onDelete: Cascade).
  await db.gym.delete({ where: { id: gym.id } });
}

async function climber({ waiver, member }: { waiver: boolean; member: boolean }): Promise<string> {
  const { id } = await db.climber.create({
    data: {
      studentId: randomStudentId(),
      gymId,
      firstName: "Metric",
      lastName: "Climber",
      dateOfBirth: new Date("1995-01-01T00:00:00Z"),
    },
  });
  if (waiver) {
    await db.waiver.create({ data: { gymId, climberId: id, version: "v1", signedByName: "Metric Climber" } });
  }
  if (member) {
    await db.pass.create({
      data: { gymId, climberId: id, kind: "MEMBERSHIP", startsAt: new Date(Date.now() - 86_400_000), expiresAt: new Date(Date.now() + 30 * 86_400_000) },
    });
  }
  return id;
}

describe("saving desk check in attempts", () => {
  it("saves a timed check in with how the climber was found", async () => {
    const id = await climber({ waiver: true, member: true });
    expect((await checkInClimber(id, { source: "CAMERA", elapsedMs: 3200 })).ok).toBe(true);
    const rows = await db.checkInAttempt.findMany({ where: { gymId } });
    expect(rows).toEqual([
      expect.objectContaining({ climberId: id, source: "CAMERA", outcome: "CHECKED_IN", elapsedMs: 3200, wasBlocked: false }),
    ]);
  });

  it("saves a refusal with its reason, and a climber sent away", async () => {
    const id = await climber({ waiver: false, member: true });
    expect((await checkInClimber(id, { source: "SEARCH", elapsedMs: 5000 })).ok).toBe(false);
    await recordCheckInGaveUp(id, { source: "SEARCH", elapsedMs: 9000, wasBlocked: true, blockers: ["waiver_missing"] });
    const rows = await db.checkInAttempt.findMany({ where: { gymId }, orderBy: { createdAt: "asc" } });
    expect(rows.map((r) => [r.outcome, r.reason, r.wasBlocked])).toEqual([
      ["REFUSED", "waiver_missing", true],
      ["GAVE_UP", "waiver_missing", true],
    ]);
  });

  it("still checks in when there's no timing (the climber's panel)", async () => {
    const id = await climber({ waiver: true, member: true });
    expect((await checkInClimber(id)).ok).toBe(true);
    const row = await db.checkInAttempt.findFirstOrThrow({ where: { gymId, climberId: id } });
    expect(row).toMatchObject({ source: "CLIMBER_PAGE", elapsedMs: null });
  });
});

describe("getValuePropMetrics", () => {
  it("shows managers the front desk numbers for their gym", async () => {
    const ok = await climber({ waiver: true, member: true });
    await checkInClimber(ok, { source: "CAMERA", elapsedMs: 2000 });
    const blocked = await climber({ waiver: false, member: false });
    await recordCheckInGaveUp(blocked, { source: "SEARCH", wasBlocked: true, blockers: ["membership_none", "waiver_missing"] });

    const metrics = await getValuePropMetrics();
    expect(metrics?.frontDesk.timeToCheckIn.median).toBe(2000);
    expect(metrics?.frontDesk.sentAway).toBe(1);
    expect(metrics?.frontDesk.blockedShare).toBe(0.5);
    expect(metrics?.daily).toHaveLength(14);
  });

  it("shows desk staff nothing", async () => {
    auth.role = "DESK";
    expect(await getValuePropMetrics()).toBeNull();
  });
});
