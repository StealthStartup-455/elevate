import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/features/auth/queries";
import { db } from "@/lib/db";
import { joinGym } from "./actions";
import { provisionGym } from "./provision";

const auth = vi.hoisted(() => ({
  user: null as CurrentUser | null,
  demoId: undefined as string | undefined,
  demoIds: [] as string[],
}));
vi.mock("@/features/auth/queries", () => ({ getCurrentUser: async () => auth.user }));
vi.mock("@/features/auth/session", () => ({
  getDemoClimberId: async () => auth.demoId,
  getDemoClimberIds: async () => auth.demoId ? [auth.demoId, ...auth.demoIds] : [],
  setSession: vi.fn(), setActiveClimberSession: vi.fn(), clearSession: vi.fn(), setDeskSession: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
}));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn() }));

const SLUGS = ["test-gym-join-source", "test-gym-join-target", "test-gym-provision-retry", "test-gym-provision-recovered"];
let sourceGymId: string;
let targetGymId: string;

async function cleanup() {
  const gyms = await db.gym.findMany({ where: { slug: { in: SLUGS } }, select: { id: true } });
  const gymId = { in: gyms.map((gym) => gym.id) };
  await db.climber.deleteMany({ where: { gymId } });
  await db.staff.deleteMany({ where: { gymId } });
  await db.gym.deleteMany({ where: { id: gymId } });
}

beforeAll(async () => {
  await cleanup();
  sourceGymId = (await db.gym.create({ data: { name: "Join source", slug: SLUGS[0] } })).id;
  targetGymId = (await db.gym.create({ data: { name: "Join target", slug: SLUGS[1] } })).id;
});
beforeEach(async () => {
  auth.user = null;
  auth.demoId = undefined;
  auth.demoIds = [];
  await db.climber.deleteMany({ where: { gymId: { in: [sourceGymId, targetGymId] } } });
});
afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

const profile = {
  firstName: "Alex", lastName: "Climber", studentId: "V00123456", phone: "+12505550100",
  email: "alex@example.test", dateOfBirth: "1990-01-01",
};

async function concurrentJoins() {
  const results = await Promise.allSettled([
    joinGym(SLUGS[1], new FormData()),
    joinGym(SLUGS[1], new FormData()),
  ]);
  expect(results.map((result) => result.status)).toEqual(["rejected", "rejected"]);
  for (const result of results) {
    if (result.status === "rejected") expect(result.reason.message).toBe("redirect /me/register");
  }
  const climbers = await db.climber.findMany({ where: { gymId: targetGymId } });
  expect(climbers).toHaveLength(1);
  return climbers[0];
}

describe("concurrent gym joins", () => {
  it("keeps simultaneous real joins on one record while permitting family records", async () => {
    auth.user = { authUserId: "test-join-account", staff: null, climberIds: [], customerProfile: profile };
    const climber = await concurrentJoins();
    expect(climber.authUserId).toBe("test-join-account");
    await db.climber.create({
      data: { ...profile, studentId: "V00123457", dateOfBirth: new Date("2015-01-01"), gymId: targetGymId, authUserId: "test-join-account" },
    });
    expect(await db.climber.count({ where: { gymId: targetGymId } })).toBe(2);
  });

  it("reuses a demo record across simultaneous joins and joins from another active gym", async () => {
    const source = await db.climber.create({
      data: { ...profile, dateOfBirth: new Date("1990-01-01"), gymId: sourceGymId },
    });
    auth.demoId = source.id;
    const target = await concurrentJoins();
    expect(target.authUserId).toBe(`demo-customer-${source.id}`);
    auth.demoId = target.id;
    await expect(joinGym(SLUGS[0], new FormData())).rejects.toThrow("redirect /me/register");
    auth.demoId = source.id;
    await expect(joinGym(SLUGS[1], new FormData())).rejects.toThrow("redirect /me/register");
    expect(await db.climber.count({ where: { gymId: targetGymId } })).toBe(1);
    expect(await db.climber.count({ where: { gymId: sourceGymId } })).toBe(1);
  });

  it("reuses remembered demo records created before stable demo identities existed", async () => {
    const data = { ...profile, dateOfBirth: new Date("1990-01-01") };
    const source = await db.climber.create({ data: { ...data, gymId: sourceGymId } });
    const existing = await db.climber.create({ data: { ...data, gymId: targetGymId } });
    auth.demoId = source.id;
    auth.demoIds = [existing.id];
    await expect(joinGym(SLUGS[1], new FormData())).rejects.toThrow("redirect /me/register");
    const rows = await db.climber.findMany({ where: { gymId: targetGymId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: existing.id, authUserId: `demo-customer-${source.id}` });
  });

  it.each(["real", "demo"])("does not claim another climber's student ID during a %s join", async (mode) => {
    const data = { ...profile, dateOfBirth: new Date("1990-01-01") };
    const existing = await db.climber.create({ data: { ...data, gymId: targetGymId } });
    if (mode === "demo") {
      auth.demoId = (await db.climber.create({ data: { ...data, gymId: sourceGymId } })).id;
    } else {
      auth.user = { authUserId: "test-join-account", staff: null, climberIds: [], customerProfile: profile };
    }
    await expect(joinGym(SLUGS[1], new FormData())).rejects.toThrow("redirect /me/explore?error=student-id-taken");
    const rows = await db.climber.findMany({ where: { gymId: targetGymId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: existing.id, authUserId: null });
  });
});

describe("recoverable gym provisioning", () => {
  it("creates only one owner and gym when confirmation or login is retried concurrently", async () => {
    const gym = { gymName: "Test gym provision retry", ownerName: "Owner", timeZone: "America/Vancouver" };
    const results = await Promise.all([
      provisionGym("test-provision-owner", gym), provisionGym("test-provision-owner", gym),
    ]);
    expect(results[0]).toHaveProperty("gymId");
    expect(results[1]).toEqual(results[0]);
    expect(await db.gym.count({ where: { slug: SLUGS[2] } })).toBe(1);
    expect(await db.staff.count({ where: { authUserId: "test-provision-owner" } })).toBe(1);
  });

  it("allows a confirmed owner to retry a taken name without losing their account", async () => {
    const taken = { gymName: "Test gym join source", ownerName: "Owner", timeZone: "America/Vancouver" };
    expect(await provisionGym("test-retry-after-conflict", taken)).toMatchObject({ error: expect.stringMatching(/name is taken/) });
    expect(await db.staff.count({ where: { authUserId: "test-retry-after-conflict" } })).toBe(0);
    const retry = await provisionGym("test-retry-after-conflict", { ...taken, gymName: "Test gym provision recovered" });
    expect(retry).toHaveProperty("gymId");
    expect(await db.staff.count({ where: { authUserId: "test-retry-after-conflict" } })).toBe(1);
  });
});
