// Needs a Postgres database with the migrations applied (DATABASE_URL).
// Run with `npm run test:db`; CI runs it against its own database.
// The desk's day of check-ins (#168): the gym's day in its time zone, gym
// isolation, paging, and what each row says.
import "dotenv/config";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { ensureDemoDay } from "./demo-day";
import { getFrontDeskBusyness } from "@/features/analytics/queries";

const SLUG = "test-desk-day";
const OTHER_SLUG = "test-desk-day-other";
const auth = vi.hoisted(() => ({ staff: true, gymId: "" }));

vi.mock("next/server", () => ({ connection: async () => {} }));
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
vi.mock("@/features/auth/session", () => ({ getDemoClimberId: async () => null }));
// Uncached here, so each test sees the gym it just set up.
vi.mock("@/lib/gym", () => ({
  getGymById: async (id: string) => db.gym.findUnique({ where: { id } }),
}));

const { getDeskDay } = await import("./queries");

const DAY_MS = 24 * 3_600_000;
// A past day in Victoria: midnight to midnight is 07:00Z to 07:00Z next day.
const DAY = "2026-10-20";
const at = (iso: string) => new Date(iso);

let gymId = "";
let otherGymId = "";

beforeAll(async () => {
  await cleanUp();
  gymId = (await db.gym.create({ data: { name: "Desk day test gym", slug: SLUG } })).id;
  otherGymId = (await db.gym.create({ data: { name: "Other desk day gym", slug: OTHER_SLUG } })).id;
});

beforeEach(async () => {
  auth.staff = true;
  auth.gymId = gymId;
  for (const id of [gymId, otherGymId]) await clearGym(id);
});

afterEach(() => {
  vi.unstubAllEnvs();
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

// A climber with a waiver signed a month ago (good for most of a year) and,
// by default, an active membership.
async function climber(
  firstName: string,
  lastName: string,
  { gym = gymId, member = true }: { gym?: string; member?: boolean } = {},
): Promise<string> {
  const { id } = await db.climber.create({
    data: { gymId: gym, firstName, lastName, dateOfBirth: at("1995-01-01T00:00:00Z") },
  });
  await db.waiver.create({
    data: {
      gymId: gym,
      climberId: id,
      version: "v1",
      signedByName: `${firstName} ${lastName}`,
      signedAt: new Date(Date.now() - 30 * DAY_MS),
    },
  });
  if (member) {
    await db.pass.create({
      data: {
        gymId: gym,
        climberId: id,
        kind: "MEMBERSHIP",
        startsAt: at("2026-01-01T00:00:00Z"),
        expiresAt: new Date(Date.now() + 60 * DAY_MS),
      },
    });
  }
  return id;
}

function checkIn(climberId: string, when: string, gym = gymId) {
  return db.checkIn.create({
    data: { gymId: gym, climberId, checkedInAt: at(when), method: "FRONT_DESK" },
  });
}

describe("getDeskDay", () => {
  it("keeps daily demo attendance, the table and new check-ins connected", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    vi.stubEnv("APP_ENV", "test");
    vi.stubEnv("MOCK_BUSYNESS_SCENARIO", "quiet");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-04T19:00:00Z"));
    const id = await climber("Demo", "Starter");
    await db.climber.update({ where: { id }, data: { externalId: "climber-1" } });
    const gym = await db.gym.findUniqueOrThrow({ where: { id: gymId } });
    const now = new Date();
    const demo = { ...gym, slug: "demo-gym" };
    // Two desks arriving together and a later refresh must not add more people.
    await Promise.all([ensureDemoDay(demo, now), ensureDemoDay(demo, now)]);
    await ensureDemoDay(demo, new Date(now.getTime() + 60_000));
    const before = await getDeskDay({}, now);
    expect(before.total).toBe(1);
    expect(before.hourly.reduce((a, b) => a + b, 0)).toBe(1);
    expect(await getFrontDeskBusyness(gymId)).toMatchObject({ count: 1, sampleCount: 1 });

    const arrival = await climber("New", "Arrival");
    await checkIn(arrival, now.toISOString());
    const after = await getDeskDay({}, now);
    expect(after.total).toBe(2);
    expect(after.hourly.reduce((a, b) => a + b, 0)).toBe(2);
    expect(await getFrontDeskBusyness(gymId)).toMatchObject({ count: 2, sampleCount: 1 });

    // Saved visits really age out; refreshing doesn't move their timestamps.
    await ensureDemoDay(demo, new Date(now.getTime() + 121 * 60_000));
    expect(await db.checkIn.count({ where: { gymId } })).toBe(2);
    vi.setSystemTime(new Date(now.getTime() + 121 * 60_000));
    expect(await getFrontDeskBusyness(gymId)).toMatchObject({ count: 0, sampleCount: 0 });

    // The next local day gets its own starting attendance, preserving history.
    const tomorrow = new Date(now.getTime() + DAY_MS);
    vi.setSystemTime(tomorrow);
    await ensureDemoDay(demo, tomorrow);
    expect((await getDeskDay({}, tomorrow)).total).toBe(1);
    expect((await getDeskDay({ date: before.day }, tomorrow)).total).toBe(2);
    expect(await getFrontDeskBusyness(gymId)).toMatchObject({ count: 1, sampleCount: 1 });
  });

  it("never populates attendance in production or an unrelated gym", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    vi.stubEnv("MOCK_BUSYNESS_SCENARIO", "moderate");
    const id = await climber("Demo", "Guard");
    await db.climber.update({ where: { id }, data: { externalId: "climber-1" } });
    const gym = await db.gym.findUniqueOrThrow({ where: { id: gymId } });
    vi.stubEnv("APP_ENV", "production");
    await ensureDemoDay({ ...gym, slug: "demo-gym" }, new Date());
    vi.stubEnv("APP_ENV", "test");
    await ensureDemoDay(gym, new Date());
    vi.stubEnv("MOCK_BUSYNESS_SCENARIO", "none");
    await ensureDemoDay({ ...gym, slug: "demo-gym" }, new Date());
    expect(await db.checkIn.count({ where: { gymId } })).toBe(0);
  });

  it("reads the gym's day in its time zone, not UTC's", async () => {
    const id = await climber("Jose", "Garcia");
    await checkIn(id, "2026-10-20T06:59:00Z"); // Oct 19, 11:59 p.m.
    const first = await checkIn(id, "2026-10-20T07:00:00Z"); // Oct 20, midnight
    const last = await checkIn(id, "2026-10-21T06:59:00Z"); // Oct 20, 11:59 p.m.
    await checkIn(id, "2026-10-21T07:00:00Z"); // Oct 21, midnight

    const day = await getDeskDay({ date: DAY });
    expect(day.day).toBe(DAY);
    expect(day.rows.map((r) => r.id)).toEqual([last.id, first.id]);
    expect(day.total).toBe(2);
    expect(day.hourly[0]).toBe(1);
    expect(day.hourly[23]).toBe(1);
  });

  it("shows only the signed-in staff member's gym", async () => {
    const ours = await climber("Sam", "Singh");
    const theirs = await climber("Sam", "Elsewhere", { gym: otherGymId });
    await checkIn(ours, "2026-10-20T19:00:00Z");
    await checkIn(theirs, "2026-10-20T19:00:00Z", otherGymId);
    await checkIn(theirs, "2026-10-20T20:00:00Z", otherGymId);

    const day = await getDeskDay({ date: DAY });
    expect(day.rows.map((r) => r.lastName)).toEqual(["Singh"]);
    expect(day.total).toBe(1);

    auth.gymId = otherGymId;
    const other = await getDeskDay({ date: DAY });
    expect(other.rows.map((r) => r.lastName)).toEqual(["Elsewhere", "Elsewhere"]);
  });

  it("is staff only", async () => {
    auth.staff = false;
    await expect(getDeskDay({ date: DAY })).rejects.toThrow("redirect /login");
  });

  it("pages 25 at a time, newest first, without losing rows that share a time", async () => {
    const ids = [];
    for (let i = 0; i < 6; i++) ids.push(await climber(`Climber${i}`, "Paging"));
    // 30 check-ins, five at each of six times.
    for (let i = 0; i < 30; i++) {
      await checkIn(ids[i % 6], `2026-10-20T${String(15 + Math.floor(i / 5)).padStart(2, "0")}:00:00Z`);
    }

    const one = await getDeskDay({ date: DAY, page: "1" });
    const two = await getDeskDay({ date: DAY, page: "2" });
    expect(one).toMatchObject({ page: 1, pageCount: 2, total: 30 });
    expect(one.rows).toHaveLength(25);
    expect(two.rows).toHaveLength(5);
    const all = [...one.rows, ...two.rows];
    expect(new Set(all.map((r) => r.id)).size).toBe(30);
    const times = all.map((r) => r.checkedInAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it("falls back to page 1 and today for bad values", async () => {
    const id = await climber("Riley", "Martin");
    await checkIn(id, "2026-10-20T19:00:00Z");

    for (const page of ["9", "0", "abc"]) {
      expect((await getDeskDay({ date: DAY, page })).page).toBe(1);
    }
    const now = at("2026-10-20T19:30:00Z");
    for (const date of [undefined, "2026-02-30", "nope", "2026-10-21"]) {
      expect((await getDeskDay({ date }, now)).day).toBe(DAY);
    }
  });

  it("has one empty page on a day with no check-ins", async () => {
    expect(await getDeskDay({ date: "2026-10-01" })).toMatchObject({
      rows: [],
      total: 0,
      page: 1,
      pageCount: 1,
    });
  });

  it("calls out a first visit, and only the first", async () => {
    const regular = await climber("Avery", "Lee");
    const fresh = await climber("Mia", "Nguyen");
    await checkIn(regular, "2026-10-19T19:00:00Z");
    await checkIn(regular, "2026-10-20T19:00:00Z");
    await checkIn(fresh, "2026-10-20T20:00:00Z");
    await checkIn(fresh, "2026-10-21T01:00:00Z"); // back the same evening

    const day = await getDeskDay({ date: DAY });
    const messages = day.rows.map((r) => `${r.firstName}: ${r.message.text}`);
    expect(messages).toEqual(["Mia: Gym access", "Mia: First visit", "Avery: Gym access"]);
  });

  it("shows the pass that let them in, even after it ran out", async () => {
    const dayPass = await climber("Drew", "Park", { member: false });
    await db.pass.create({
      data: {
        gymId,
        climberId: dayPass,
        kind: "DAY",
        startsAt: at("2026-10-20T17:00:00Z"),
        expiresAt: at("2026-10-21T07:00:00Z"),
      },
    });
    await checkIn(dayPass, "2026-10-20T18:00:00Z");

    const punch = await climber("Leo", "Martin", { member: false });
    await db.pass.create({
      data: { gymId, climberId: punch, kind: "PUNCH", startsAt: at("2026-10-01T00:00:00Z"), visitsLeft: 0 },
    });
    await checkIn(punch, "2026-10-01T18:00:00Z");
    await checkIn(punch, "2026-10-20T19:00:00Z");

    const day = await getDeskDay({ date: DAY });
    const byName = new Map(day.rows.map((r) => [r.firstName, r]));
    // Drew's only visit, so the message is about that rather than the pass.
    expect(byName.get("Drew")).toMatchObject({ badge: "DAY_PASS", message: { text: "First visit" } });
    expect(byName.get("Leo")).toMatchObject({
      badge: "PUNCH_CARD",
      message: { text: "Last visit on the card", tone: "warning" },
    });
  });

  it("shows the waiver as it is now", async () => {
    const id = await climber("Quinn", "Campbell");
    await db.waiver.updateMany({
      where: { climberId: id },
      // Runs out in three days.
      data: { signedAt: new Date(Date.now() - 365 * DAY_MS + 3 * DAY_MS) },
    });
    await checkIn(id, "2026-10-20T19:00:00Z");

    const [row] = (await getDeskDay({ date: DAY })).rows;
    expect(row.waiver.tone).toBe("warning");
    expect(row.waiver.text).toMatch(/^Expires /);
    expect(row.message.text).toMatch(/^Waiver expires /);
  });
});
