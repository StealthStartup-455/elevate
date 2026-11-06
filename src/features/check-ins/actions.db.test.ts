// Needs a Postgres database with the migrations applied (DATABASE_URL).
// Run with `npm run test:db`; CI runs it against its own database.
// The Check-in page's climber panel (#169): getDeskClimberPanel is staff only,
// shows only the staff member's gym, and says when they last checked in.
import "dotenv/config";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_CHECK_IN_PREFIX } from "@/features/analytics/mock-data";
import { db } from "@/lib/db";

const SLUG = "test-desk-panel";
const OTHER_SLUG = "test-desk-panel-other";
const auth = vi.hoisted(() => ({ staff: true, gymId: "" }));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/features/auth/staff", () => ({
  isStaff: async () => auth.staff,
  getStaffContext: async () => (auth.staff ? { id: null, gymId: auth.gymId, role: "DESK" } : null),
  requireStaff: async () => {
    if (!auth.staff) throw new Error("redirect /login");
  },
}));
vi.mock("@/features/auth/queries", () => ({
  getCurrentUser: async () => null,
  getSessionClimberId: async () => null,
}));
vi.mock("@/features/auth/session", () => ({ getDemoClimberId: async () => null }));
// Uncached here, so each test sees the gym it just set up.
vi.mock("@/lib/gym", () => ({
  getGymById: async (id: string) => db.gym.findUnique({ where: { id } }),
  getGym: async () => db.gym.findUniqueOrThrow({ where: { slug: SLUG } }),
}));

const { getDeskClimberPanel } = await import("./actions");

// 2 p.m. in Los Angeles (UTC-8). Not Vancouver: tzdata 2026b keeps BC on
// UTC-7 all year from November 2026, while older Node versions still switch
// it to UTC-8.
const NOW = new Date("2026-11-04T22:00:00Z");
const MINUTE = 60_000;

let gymId = "";
let otherGymId = "";

beforeAll(async () => {
  await cleanUp();
  gymId = (await db.gym.create({ data: { name: "Panel test gym", slug: SLUG, timeZone: "America/Los_Angeles" } })).id;
  otherGymId = (await db.gym.create({ data: { name: "Other panel gym", slug: OTHER_SLUG } })).id;
});

beforeEach(async () => {
  auth.staff = true;
  auth.gymId = gymId;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  for (const id of [gymId, otherGymId]) await clearGym(id);
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await cleanUp();
  await db.$disconnect();
});

async function clearGym(id: string) {
  const where = { where: { gymId: id } };
  await db.checkIn.deleteMany(where);
  await db.pass.deleteMany(where);
  await db.waiver.deleteMany(where);
  await db.climber.deleteMany(where);
}

async function cleanUp() {
  for (const slug of [SLUG, OTHER_SLUG]) {
    const gym = await db.gym.findUnique({ where: { slug } });
    if (!gym) continue;
    await clearGym(gym.id);
    await db.gym.delete({ where: { id: gym.id } });
  }
}

// A member with a waiver signed a month ago, born Jun 14, 1997.
async function member(gym = gymId): Promise<string> {
  const { id } = await db.climber.create({
    data: { gymId: gym, firstName: "Alex", lastName: "Nguyen", dateOfBirth: new Date("1997-06-14T00:00:00Z") },
  });
  await db.waiver.create({
    data: { gymId: gym, climberId: id, version: "v1", signedByName: "Alex Nguyen", signedAt: new Date(NOW.getTime() - 30 * 1440 * MINUTE) },
  });
  await db.pass.create({
    data: {
      gymId: gym,
      climberId: id,
      kind: "MEMBERSHIP",
      startsAt: new Date("2026-01-01T00:00:00Z"),
      expiresAt: new Date(NOW.getTime() + 60 * 1440 * MINUTE),
    },
  });
  return id;
}

function checkIn(climberId: string, minutesAgo: number, id?: string) {
  return db.checkIn.create({
    data: { id, gymId, climberId, method: "FRONT_DESK", checkedInAt: new Date(NOW.getTime() - minutesAgo * MINUTE) },
  });
}

describe("getDeskClimberPanel", () => {
  it("refuses anyone who isn't staff", async () => {
    const id = await member();
    auth.staff = false;
    await expect(getDeskClimberPanel(id)).rejects.toThrow("redirect /login");
  });

  it("shows nothing for an id that isn't a climber, or another gym's climber", async () => {
    expect(await getDeskClimberPanel("not-an-id")).toBeNull();
    expect(await getDeskClimberPanel("00000000-0000-4000-8000-000000000000")).toBeNull();
    const elsewhere = await member(otherGymId);
    expect(await getDeskClimberPanel(elsewhere)).toBeNull();
  });

  it("shows the climber as the database has them", async () => {
    const id = await member();
    const panel = await getDeskClimberPanel(id);
    expect(panel).toMatchObject({
      climber: { id, firstName: "Alex", lastName: "Nguyen", waiverStatus: "valid", membershipStatus: "active" },
      gymName: "Panel test gym",
      age: 29,
      waiver: { status: "valid" },
      checkedInAt: null,
      checkedInRecently: false,
      employee: false,
    });
  });

  it("says when they checked in, and whether checking in again is allowed yet", async () => {
    const id = await member();
    // Yesterday doesn't count as today.
    await checkIn(id, 20 * 60);
    expect(await getDeskClimberPanel(id)).toMatchObject({ checkedInAt: null, checkedInRecently: false });

    // Earlier today, more than two hours ago: shown, and they can come back in.
    await checkIn(id, 3 * 60);
    expect(await getDeskClimberPanel(id)).toMatchObject({ checkedInAt: "11:00 a.m.", checkedInRecently: false });

    // Within the two hours checkInClimber refuses a second check-in.
    await checkIn(id, 30);
    expect(await getDeskClimberPanel(id)).toMatchObject({ checkedInAt: "1:30 p.m.", checkedInRecently: true });
  });

  it("marks the demo's employee visit, the same as the table", async () => {
    const id = await member();
    await checkIn(id, 10, `${DEMO_CHECK_IN_PREFIX}${gymId}:2026-11-04:example:employee`);
    expect(await getDeskClimberPanel(id)).toMatchObject({ employee: true });
  });
});
