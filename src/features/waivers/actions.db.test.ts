// Needs a Postgres database with the migrations applied (DATABASE_URL).
// Run with `npm run test:db`; CI runs it against its own database.
// Publishing new waiver wording (#110): it adds the next version and points
// the gym at it, never edits a version, refuses stale or unchanged edits, only
// for managers and owners, and only in the staff member's own gym.
import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { hashWaiver } from "./hash";

const SLUG = "test-waiver-editor";
const OTHER_SLUG = "test-waiver-editor-other";
const auth = vi.hoisted(() => ({ staff: true, canEdit: true, gymId: "" }));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));
vi.mock("@/features/auth/staff", () => ({
  isStaff: async () => auth.staff,
  getStaffContext: async () => (auth.staff ? { id: null, gymId: auth.gymId, role: "MANAGER" } : null),
}));
vi.mock("@/features/auth/queries", () => ({
  getCurrentUser: async () => null,
  getSessionClimberId: async () => null,
}));
vi.mock("./access", () => ({
  canActForClimber: async () => false,
  canEditWaiver: async () => auth.canEdit,
}));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn() }));
vi.mock("@/lib/gym", () => ({
  forgetGym: vi.fn(),
  getGym: async () => db.gym.findUniqueOrThrow({ where: { slug: SLUG } }),
  getGymById: async (id: string) => db.gym.findUnique({ where: { id } }),
}));

const { publishWaiver } = await import("./actions");
const { getStaffWaiverWording } = await import("./queries");

const V1 = { title: "Waiver", body: "Climbing is dangerous.", clauses: ["I understand."] };

let gymId = "";
let otherGymId = "";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries({ confirm: "on", ...fields })) data.set(name, value);
  return data;
}

const publish = (fields: Record<string, string>) => publishWaiver({ status: "idle" }, form(fields));

async function cleanUp() {
  for (const slug of [SLUG, OTHER_SLUG]) {
    const gym = await db.gym.findUnique({ where: { slug } });
    if (!gym) continue;
    await db.waiver.deleteMany({ where: { gymId: gym.id } });
    await db.climber.deleteMany({ where: { gymId: gym.id } });
    await db.waiverTemplate.deleteMany({ where: { gymId: gym.id } });
    await db.gym.delete({ where: { id: gym.id } });
  }
}

beforeAll(async () => {
  await cleanUp();
  gymId = (await db.gym.create({ data: { name: "Waiver editor test gym", slug: SLUG } })).id;
  otherGymId = (await db.gym.create({ data: { name: "Other waiver gym", slug: OTHER_SLUG } })).id;
});

beforeEach(async () => {
  auth.staff = true;
  auth.canEdit = true;
  auth.gymId = gymId;
  for (const id of [gymId, otherGymId]) {
    await db.waiver.deleteMany({ where: { gymId: id } });
    await db.climber.deleteMany({ where: { gymId: id } });
    await db.waiverTemplate.deleteMany({ where: { gymId: id } });
    await db.gym.update({ where: { id }, data: { waiverVersion: null } });
  }
  await db.waiverTemplate.create({ data: { gymId, version: "v1", ...V1, bodyHash: hashWaiver(V1) } });
  await db.gym.update({ where: { id: gymId }, data: { waiverVersion: "v1" } });
});

afterAll(async () => {
  await cleanUp();
  await db.$disconnect();
});

describe("publishWaiver", () => {
  it("adds v2, points the gym at it, and leaves v1 as it was", async () => {
    await expect(
      publish({ baseVersion: "v1", title: "Waiver", body: "Climbing is very dangerous.", clauses: "I understand." }),
    ).rejects.toThrow("redirect /desk/waivers?published=v2");

    const gym = await db.gym.findUniqueOrThrow({ where: { id: gymId } });
    expect(gym.waiverVersion).toBe("v2");
    const [v1, v2] = await db.waiverTemplate.findMany({ where: { gymId }, orderBy: { version: "asc" } });
    expect(v1).toMatchObject({ version: "v1", body: "Climbing is dangerous.", bodyHash: hashWaiver(V1) });
    expect(v2).toMatchObject({ version: "v2", body: "Climbing is very dangerous.", clauses: ["I understand."] });
    expect(v2.bodyHash).toBe(hashWaiver(v2));
  });

  it("refuses wording that didn't change", async () => {
    const state = await publish({ baseVersion: "v1", title: "Waiver", body: "Climbing is dangerous.", clauses: "I understand." });
    expect(state).toMatchObject({ status: "error", message: expect.stringMatching(/Nothing changed/) });
    expect(await db.waiverTemplate.count({ where: { gymId } })).toBe(1);
  });

  it("refuses an edit started on an older version", async () => {
    const state = await publish({ baseVersion: "", title: "New", body: "New text.", clauses: "" });
    expect(state).toMatchObject({ status: "error", message: expect.stringMatching(/Someone else published/) });
    expect((await db.gym.findUniqueOrThrow({ where: { id: gymId } })).waiverVersion).toBe("v1");
  });

  it("sends back the errors and what was typed", async () => {
    const state = await publishWaiver(
      { status: "idle" },
      (() => {
        const data = new FormData();
        data.set("baseVersion", "v1");
        data.set("title", "");
        data.set("body", "Text");
        return data;
      })(),
    );
    expect(state.errors).toMatchObject({ title: expect.any(String), confirm: expect.any(String) });
    expect(state.values).toMatchObject({ title: "", body: "Text", confirm: false });
  });

  it("refuses staff who aren't managers or owners, and anyone not staff", async () => {
    auth.canEdit = false;
    expect(await publish({ baseVersion: "v1", title: "New", body: "New text." })).toMatchObject({ status: "error" });
    auth.canEdit = true;
    auth.staff = false;
    expect(await publish({ baseVersion: "v1", title: "New", body: "New text." })).toMatchObject({ status: "error" });
    expect(await db.waiverTemplate.count({ where: { gymId } })).toBe(1);
  });

  it("publishes in the staff member's own gym only", async () => {
    auth.gymId = otherGymId;
    await expect(publish({ baseVersion: "", title: "Other gym", body: "Their text." })).rejects.toThrow(
      "redirect /desk/waivers?published=v1",
    );
    expect((await db.gym.findUniqueOrThrow({ where: { id: otherGymId } })).waiverVersion).toBe("v1");
    expect((await db.gym.findUniqueOrThrow({ where: { id: gymId } })).waiverVersion).toBe("v1");
    expect(await db.waiverTemplate.count({ where: { gymId } })).toBe(1);
  });
});

describe("getStaffWaiverWording", () => {
  it("lists every version newest first, with signatures and the current one", async () => {
    await expect(publish({ baseVersion: "v1", title: "Waiver", body: "New text." })).rejects.toThrow();
    const v1 = await db.waiverTemplate.findFirstOrThrow({ where: { gymId, version: "v1" } });
    const climber = await db.climber.create({
      data: { gymId, firstName: "Ada", lastName: "Test", dateOfBirth: new Date("1990-01-01"), phone: "+12505550100" },
    });
    await db.waiver.create({
      data: { gymId, climberId: climber.id, version: "v1", templateId: v1.id, signedByName: "Ada Test" },
    });

    const wording = await getStaffWaiverWording();
    expect(wording?.current).toMatchObject({ version: "v2", body: "New text.", clauses: [] });
    expect(wording?.versions.map((v) => [v.version, v.signatures, v.current])).toEqual([
      ["v2", 0, true],
      ["v1", 1, false],
    ]);
  });

  it("is null for anyone not staff", async () => {
    auth.staff = false;
    expect(await getStaffWaiverWording()).toBeNull();
  });
});
