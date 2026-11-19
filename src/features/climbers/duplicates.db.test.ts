// Needs a Postgres database with the migrations applied (DATABASE_URL).
// Run with `npm run test:db`; CI runs it against its own database.
// Possible duplicate climbers on Add climber and /join.
import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import type { FormState } from "./types";

const SLUG = "test-duplicates";
const auth = vi.hoisted(() => ({ gymId: "" }));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));
vi.mock("@/features/auth/staff", () => ({
  isStaff: async () => true,
  getStaffContext: async () => ({ id: null, gymId: auth.gymId, role: "DESK" }),
  requireStaff: async () => {},
}));
vi.mock("@/features/auth/queries", () => ({
  getCurrentUser: async () => null,
  getSessionClimberId: async () => null,
}));
vi.mock("@/features/auth/session", () => ({ setSession: vi.fn() }));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn() }));
vi.mock("@/lib/gym", () => ({
  getGym: async () => db.gym.findUniqueOrThrow({ where: { slug: SLUG } }),
  getGymById: async (id: string) => db.gym.findUnique({ where: { id } }),
}));

const { createClimberAtDesk, joinAsCustomer } = await import("./actions");

const IDLE: FormState = { status: "idle" };
let gymId = "";
let existingId = "";

beforeAll(async () => {
  await cleanUp();
  gymId = (await db.gym.create({ data: { name: "Duplicates test gym", slug: SLUG } })).id;
  auth.gymId = gymId;
});

beforeEach(async () => {
  await db.climber.deleteMany({ where: { gymId } });
  existingId = (
    await db.climber.create({
      data: {
        gymId,
        firstName: "Riley",
        lastName: "Haverford",
        phone: "+12505550101",
        dateOfBirth: new Date("1990-03-04T00:00:00Z"),
      },
    })
  ).id;
});

afterAll(async () => {
  await cleanUp();
  await db.$disconnect();
});

async function cleanUp() {
  const gym = await db.gym.findUnique({ where: { slug: SLUG } });
  if (!gym) return;
  await db.climber.deleteMany({ where: { gymId: gym.id } });
  await db.gym.delete({ where: { id: gym.id } });
}

function form(fields: Partial<Record<string, string>>): FormData {
  const data = new FormData();
  const all = {
    firstName: "Riley",
    lastName: "Haverford",
    phone: "250-555-0101",
    email: "",
    dateOfBirth: "1990-03-04",
    ...fields,
  };
  for (const [key, value] of Object.entries(all)) if (value !== undefined) data.set(key, value);
  return data;
}

async function deskAdd(data: FormData): Promise<FormState | string> {
  try {
    return await createClimberAtDesk(IDLE, data);
  } catch (error) {
    // A successful add redirects to the new climber's page.
    return (error as Error).message;
  }
}

const count = () => db.climber.count({ where: { gymId } });

describe("Add climber at the desk", () => {
  it("warns on the same phone, shows who, and saves nothing", async () => {
    const state = await deskAdd(form({ firstName: "Sam", dateOfBirth: "2015-06-01" }));
    expect(state).toMatchObject({ status: "duplicate", confirmKey: existingId });
    expect((state as FormState).duplicates).toEqual([
      { id: existingId, name: "Riley Haverford", phone: "250-555-0101", dateOfBirth: "1990-03-04" },
    ]);
    expect((state as FormState).values?.firstName).toBe("Sam");
    expect(await count()).toBe(1);
  });

  it("warns on the same name and birthday, ignoring case", async () => {
    const state = await deskAdd(form({ firstName: "riley", lastName: "HAVERFORD", phone: "250-555-0199" }));
    expect(state).toMatchObject({ status: "duplicate", confirmKey: existingId });
  });

  it("adds them once staff confirm", async () => {
    const result = await deskAdd(form({ confirmDuplicate: existingId }));
    expect(result).toMatch(/^redirect \/desk\/customers\/.+\?added=1$/);
    expect(await count()).toBe(2);
  });

  it("warns again when the confirmed form now matches someone else", async () => {
    const otherId = (
      await db.climber.create({
        data: {
          gymId,
          firstName: "Jo",
          lastName: "Park",
          phone: "+12505550177",
          dateOfBirth: new Date("1985-01-01T00:00:00Z"),
        },
      })
    ).id;
    const state = await deskAdd(form({ phone: "250-555-0177", confirmDuplicate: existingId }));
    expect(state).toMatchObject({ status: "duplicate" });
    expect((state as FormState).duplicates?.map((d) => d.id).sort()).toEqual(
      [existingId, otherId].sort(),
    );
  });

  it("adds a new person with no match without asking", async () => {
    const result = await deskAdd(form({ firstName: "Sam", phone: "250-555-0199" }));
    expect(result).toMatch(/^redirect /);
  });

  it("ignores climbers at another gym", async () => {
    const other = await db.gym.create({ data: { name: "Other", slug: `${SLUG}-other` } });
    try {
      await db.climber.updateMany({ where: { id: existingId }, data: { gymId: other.id } });
      expect(await deskAdd(form({}))).toMatch(/^redirect /);
    } finally {
      await db.climber.deleteMany({ where: { gymId: other.id } });
      await db.gym.delete({ where: { id: other.id } });
    }
  });
});

describe("/join", () => {
  it("warns on the same name and phone without saying who", async () => {
    const state = await joinAsCustomer(IDLE, form({ dateOfBirth: "1991-01-01" }));
    expect(state.status).toBe("duplicate");
    expect(state.duplicates).toBeUndefined();
    expect(state.message).not.toContain("Riley");
    expect(await count()).toBe(1);
  });

  it("does not warn on a phone alone, so a number can't be looked up", async () => {
    const state = await joinAsCustomer(IDLE, form({ firstName: "Sam", dateOfBirth: "2015-06-01" }));
    expect(state.status).toBe("success");
  });

  it("creates the account once they confirm", async () => {
    const first = await joinAsCustomer(IDLE, form({}));
    const state = await joinAsCustomer(first, form({ confirmDuplicate: first.confirmKey }));
    expect(state.status).toBe("success");
    expect(await count()).toBe(2);
  });
});
