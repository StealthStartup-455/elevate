// Needs a Postgres database with the migrations applied (DATABASE_URL).
// Run with `npm run test:db`; CI runs it against its own database.
// The #62 stopgap: staff give a free day pass, and check-in accepts it.
import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

const SLUG = "test-day-pass";
const auth = vi.hoisted(() => ({ staff: true, gymId: "" }));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));
vi.mock("@/features/auth/staff", () => ({
  isStaff: async () => auth.staff,
  getStaffContext: async () =>
    auth.staff ? { id: null, gymId: auth.gymId, role: "DESK" } : null,
  requireStaff: async () => {
    if (!auth.staff) throw new Error("redirect /login");
  },
}));
vi.mock("@/features/auth/queries", () => ({
  getCurrentUser: async () => null,
  getSessionClimberId: async () => null,
}));
vi.mock("@/features/auth/session", () => ({ setSession: vi.fn() }));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn() }));
// Every query runs against the test gym, not the seeded one.
vi.mock("@/lib/gym", () => ({
  getGym: async () => db.gym.findUniqueOrThrow({ where: { slug: SLUG } }),
  // Uncached here, so each test sees the gym it just set up.
  getGymById: async (id: string) => db.gym.findUnique({ where: { id } }),
}));

const { checkInClimber, giveDayPass } = await import("./actions");
const { getCheckInClimbers, getClimber } = await import("./queries");

let gymId = "";

beforeAll(async () => {
  await cleanUp();
  gymId = (await db.gym.create({ data: { name: "Day pass test gym", slug: SLUG } })).id;
  auth.gymId = gymId;
});

beforeEach(() => {
  auth.staff = true;
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
  await db.gym.delete({ where: { id: gym.id } });
}

// A new sign-up: optionally with a signed waiver, and nothing else.
async function newClimber(withWaiver = true): Promise<string> {
  const { id } = await db.climber.create({
    data: {
      gymId,
      firstName: "New",
      lastName: "Climber",
      dateOfBirth: new Date("1995-01-01T00:00:00Z"),
    },
  });
  if (withWaiver) {
    await db.waiver.create({
      data: { gymId, climberId: id, version: "v1", signedByName: "New Climber" },
    });
  }
  return id;
}

const dayPasses = (climberId: string) =>
  db.pass.findMany({ where: { gymId, climberId, kind: "DAY" } });

describe("giveDayPass", () => {
  it("lets a new climber with a waiver and no membership check in", async () => {
    const id = await newClimber();
    expect((await checkInClimber(id)).ok).toBe(false);

    expect(await giveDayPass(id)).toEqual({ ok: true });
    expect((await getClimber(id))?.hasDayPass).toBe(true);
    expect((await getClimber(id))?.membershipStatus).toBe("none");
    expect(await checkInClimber(id)).toEqual({ ok: true });
  });

  it("ends the pass at midnight in the gym's time zone", async () => {
    const id = await newClimber();
    await giveDayPass(id);
    const [pass] = await dayPasses(id);
    // America/Vancouver (the default): midnight is 07:00 or 08:00 UTC.
    expect([7, 8]).toContain(pass.expiresAt!.getUTCHours());
    expect(pass.expiresAt!.getUTCMinutes()).toBe(0);
    const hoursLeft = (pass.expiresAt!.getTime() - Date.now()) / 3_600_000;
    expect(hoursLeft).toBeGreaterThan(0);
    expect(hoursLeft).toBeLessThanOrEqual(25);
  });

  it("doesn't save a second pass when pressed twice", async () => {
    const id = await newClimber();
    await giveDayPass(id);
    expect(await giveDayPass(id)).toEqual({ ok: true });
    expect(await dayPasses(id)).toHaveLength(1);
  });

  it("refuses a climber without a valid waiver", async () => {
    const id = await newClimber(false);
    const result = await giveDayPass(id);
    expect(result.ok).toBe(false);
    expect(await dayPasses(id)).toHaveLength(0);
  });

  it("refuses a climber who already has an active membership", async () => {
    const id = await newClimber();
    const day = 24 * 3_600_000;
    await db.pass.create({
      data: {
        gymId,
        climberId: id,
        kind: "MEMBERSHIP",
        startsAt: new Date(Date.now() - day),
        expiresAt: new Date(Date.now() + 30 * day),
      },
    });
    expect((await giveDayPass(id)).ok).toBe(false);
    expect(await dayPasses(id)).toHaveLength(0);
  });

  it("is staff only", async () => {
    const id = await newClimber();
    auth.staff = false;
    await expect(giveDayPass(id)).rejects.toThrow("redirect /login");
    expect(await dayPasses(id)).toHaveLength(0);
  });

  it("does not expose or update another gym's climber", async () => {
    const otherGym = await db.gym.create({
      data: { name: "Other gym", slug: "test-day-pass-other" },
    });
    const { id } = await db.climber.create({
      data: {
        gymId: otherGym.id,
        firstName: "Other",
        lastName: "Climber",
        dateOfBirth: new Date("1995-01-01T00:00:00Z"),
      },
    });
    try {
      expect(await getClimber(id)).toBeNull();
      expect((await giveDayPass(id)).ok).toBe(false);
      expect((await checkInClimber(id)).ok).toBe(false);
      expect(await db.pass.findMany({ where: { gymId: otherGym.id, climberId: id } })).toHaveLength(0);
      expect(await db.checkIn.findMany({ where: { gymId: otherGym.id, climberId: id } })).toHaveLength(0);
    } finally {
      await db.climber.delete({ where: { id } });
      await db.gym.delete({ where: { id: otherGym.id } });
    }
  });

  // Agam's report on #119: a climber checked in at the desk showed in Recent
  // check-ins without a link to their account. The desk's saved check-ins are
  // keyed by the climber's id, so the lookup must find them by id too.
  it("links a desk check-in to the climber's account", async () => {
    const id = await newClimber();
    await giveDayPass(id);
    expect(await checkInClimber(id)).toEqual({ ok: true });
    expect((await getCheckInClimbers([id])).get(id)?.id).toBe(id);
  });

  it("doesn't let yesterday's pass in", async () => {
    const id = await newClimber();
    const now = Date.now();
    await db.pass.create({
      data: {
        gymId,
        climberId: id,
        kind: "DAY",
        startsAt: new Date(now - 30 * 3_600_000),
        expiresAt: new Date(now - 6 * 3_600_000),
      },
    });
    expect((await getClimber(id))?.hasDayPass).toBe(false);
    expect((await checkInClimber(id)).ok).toBe(false);
  });
});
