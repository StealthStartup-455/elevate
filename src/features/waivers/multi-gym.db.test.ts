import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { canActForClimber } from "./access";
import { submitWaiver } from "./actions";
import { hashWaiver } from "./hash";
import { getCurrentWaiverTemplate, getSignedWaiver, getWaiverStatus } from "./queries";

const auth = vi.hoisted(() => ({
  climberId: undefined as string | undefined,
  staffGymId: undefined as string | undefined,
}));
vi.mock("@/features/auth/queries", () => ({
  getCurrentUser: async () => null,
  getSessionClimberId: async () => auth.climberId,
}));
vi.mock("@/features/auth/session", () => ({ hasDemoDeskSession: async () => false }));
vi.mock("@/features/auth/staff", () => ({
  getStaffContext: async () => auth.staffGymId ? { id: null, gymId: auth.staffGymId, role: "OWNER" } : null,
  hasStaffRole: async () => !!auth.staffGymId,
}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn() }));

const SLUGS = ["test-waiver-scope-first", "test-waiver-scope-second"];
const wording = { title: "Second gym waiver", body: "Second gym wording.", clauses: ["I understand."] };
let firstGymId: string;
let secondGymId: string;
let climberId: string;

async function cleanup() {
  const gyms = await db.gym.findMany({ where: { slug: { in: SLUGS } }, select: { id: true } });
  const gymId = { in: gyms.map((gym) => gym.id) };
  await db.waiver.deleteMany({ where: { gymId } });
  await db.climber.deleteMany({ where: { gymId } });
  await db.waiverTemplate.deleteMany({ where: { gymId } });
  await db.gym.deleteMany({ where: { id: gymId } });
}
beforeAll(async () => {
  await cleanup();
  firstGymId = (await db.gym.create({ data: { name: "First gym", slug: SLUGS[0] } })).id;
  secondGymId = (await db.gym.create({
    data: { name: "Second gym", slug: SLUGS[1], waiverVersion: "v2" },
  })).id;
  await db.waiverTemplate.create({
    data: { ...wording, gymId: secondGymId, version: "v2", bodyHash: hashWaiver(wording) },
  });
  climberId = (await db.climber.create({
    data: { gymId: secondGymId, firstName: "Alex", lastName: "Climber", dateOfBirth: new Date("1990-01-01") },
  })).id;
});
beforeEach(async () => {
  auth.climberId = climberId;
  auth.staffGymId = undefined;
  await db.waiver.deleteMany({ where: { gymId: secondGymId } });
});
afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

function signatureForm() {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    climberId, templateVersion: "v2", clause: "0", agree: "on",
    emergencyContactName: "Emergency Contact", emergencyContactPhone: "2505550100",
    signatureImage: "data:image/png;base64,iVBORw0KGgo=",
  })) form.set(key, value);
  return form;
}

describe("selected gym waiver flow", () => {
  it("loads, signs, summarizes and reads the climber's gym wording instead of the default gym", async () => {
    expect(await getCurrentWaiverTemplate(climberId)).toMatchObject({ title: wording.title, version: "v2" });
    const result = await submitWaiver({ status: "idle" }, signatureForm());
    expect(result).toMatchObject({ status: "success", waiverId: expect.any(String) });
    expect(await getWaiverStatus(climberId)).toMatchObject({ status: "valid", waiverId: result.waiverId });
    expect(await getSignedWaiver(result.waiverId!)).toMatchObject({
      gymId: secondGymId, climberId, template: { title: wording.title, paragraphs: [wording.body] },
    });
  });

  it("does not grant staff from another gym access to signing or reading", async () => {
    auth.climberId = undefined;
    auth.staffGymId = firstGymId;
    expect(await canActForClimber(climberId)).toBe(false);
    expect(await getCurrentWaiverTemplate(climberId)).toBeNull();
    expect(await submitWaiver({ status: "idle" }, signatureForm())).toMatchObject({ status: "error" });
    auth.staffGymId = secondGymId;
    const signed = await submitWaiver({ status: "idle" }, signatureForm());
    expect(signed.status).toBe("success");
    auth.staffGymId = firstGymId;
    expect(await getSignedWaiver(signed.waiverId!)).toBeNull();
  });
});
