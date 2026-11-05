// Needs a Postgres database with the migrations applied (DATABASE_URL).
// Run with `npm run test:db`; CI runs it against its own database.
// A member keeping a mock EFT bank account on file (#179).
import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

const SLUG = "test-eft";
const OTHER_SLUG = "test-eft-other";
const session = vi.hoisted(() => ({ climberId: null as string | null, staffSlug: null as string | null }));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/queries", () => ({
  getSessionClimberId: async () => session.climberId,
  getCurrentUser: async () =>
    session.climberId ? { authUserId: "test", staff: null, climberIds: [session.climberId] } : null,
}));
vi.mock("@/features/auth/session", () => ({ getDemoClimberId: async () => null }));
vi.mock("@/features/auth/staff", () => ({
  isStaff: async () => session.staffSlug !== null,
  requireStaff: async () => {
    if (!session.staffSlug) throw new Error("redirect /login");
  },
  getStaffContext: async () =>
    session.staffSlug
      ? { id: null, gymId: (await db.gym.findUniqueOrThrow({ where: { slug: session.staffSlug } })).id, role: "DESK" }
      : null,
}));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn() }));
vi.mock("@/lib/gym", () => ({
  getGym: async () => {
    throw new Error("getGym() must not be used");
  },
  getGymById: async (id: string) => db.gym.findUnique({ where: { id } }),
}));

const { saveMyBankAccount, removeMyBankAccount, saveClimberBankAccount, removeClimberBankAccount } = await import(
  "./actions"
);
const { getMyBankAccount, getBankAccountForStaff } = await import("./queries");
const { getPosClimber } = await import("@/features/pos/actions");

const account = {
  holderName: "Kim Lee",
  transitNumber: "01234",
  institutionNumber: "003",
  accountNumber: "1234567890",
  authorized: true,
};

let gymId = "";
let otherGymId = "";

beforeAll(async () => {
  await cleanUp();
  gymId = (await db.gym.create({ data: { name: "EFT test gym", slug: SLUG } })).id;
  otherGymId = (await db.gym.create({ data: { name: "EFT other gym", slug: OTHER_SLUG } })).id;
});

beforeEach(() => {
  session.climberId = null;
  session.staffSlug = null;
});

afterAll(async () => {
  await cleanUp();
  await db.$disconnect();
});

async function cleanUp() {
  for (const slug of [SLUG, OTHER_SLUG]) {
    const gym = await db.gym.findUnique({ where: { slug } });
    if (!gym) continue;
    await db.bankAccount.deleteMany({ where: { gymId: gym.id } });
    await db.climber.deleteMany({ where: { gymId: gym.id } });
    await db.gym.delete({ where: { id: gym.id } });
  }
}

async function newClimber(gym = gymId): Promise<string> {
  const { id } = await db.climber.create({
    data: { gymId: gym, firstName: "Kim", lastName: "Lee", dateOfBirth: new Date("1995-01-01T00:00:00Z") },
  });
  return id;
}

describe("saveMyBankAccount", () => {
  it("saves the account with only the last four digits and a mock token", async () => {
    const id = await newClimber();
    session.climberId = id;
    const result = await saveMyBankAccount(account);
    expect(result).toMatchObject({ ok: true, account: { label: "RBC ••••7890", transitNumber: "01234" } });

    const row = await db.bankAccount.findFirstOrThrow({ where: { climberId: id } });
    expect(row).toMatchObject({ gymId, accountLast4: "7890", institutionNumber: "003" });
    expect(row.token).toMatch(/^mock_eft_/);
    expect(JSON.stringify(row)).not.toContain("1234567890");
    expect(await getMyBankAccount()).toMatchObject({ label: "RBC ••••7890", holderName: "Kim Lee" });
  });

  it("replaces the account on a second save, keeping one per climber", async () => {
    const id = await newClimber();
    session.climberId = id;
    await saveMyBankAccount(account);
    await saveMyBankAccount({ ...account, institutionNumber: "004", accountNumber: "5555111" });
    expect(await db.bankAccount.count({ where: { climberId: id } })).toBe(1);
    expect(await getMyBankAccount()).toMatchObject({ label: "TD ••••5111" });
  });

  it("says which fields are wrong and saves nothing", async () => {
    const id = await newClimber();
    session.climberId = id;
    const result = await saveMyBankAccount({ ...account, transitNumber: "12", authorized: false });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors ?? {}).sort()).toEqual(["authorized", "transitNumber"]);
    expect(await db.bankAccount.count({ where: { climberId: id } })).toBe(0);
  });

  it("refuses when nobody is signed in", async () => {
    expect((await saveMyBankAccount(account)).ok).toBe(false);
    expect(await getMyBankAccount()).toBeNull();
  });
});

describe("removeMyBankAccount", () => {
  it("removes the account, and removing twice is fine", async () => {
    const id = await newClimber();
    session.climberId = id;
    await saveMyBankAccount(account);
    expect(await removeMyBankAccount()).toEqual({ ok: true, account: null });
    expect(await removeMyBankAccount()).toEqual({ ok: true, account: null });
    expect(await db.bankAccount.count({ where: { climberId: id } })).toBe(0);
  });
});

describe("the POS climber card", () => {
  it("shows the account to the climber's own gym only", async () => {
    const id = await newClimber();
    session.climberId = id;
    await saveMyBankAccount(account);
    session.climberId = null;

    session.staffSlug = SLUG;
    expect((await getPosClimber(id))?.bankAccount?.label).toBe("RBC ••••7890");

    session.staffSlug = OTHER_SLUG;
    expect(await getPosClimber(id)).toBeNull();
  });

  it("says none is on file", async () => {
    const id = await newClimber();
    session.staffSlug = SLUG;
    expect((await getPosClimber(id))?.bankAccount).toBeNull();
  });

  it("goes with the climber when the climber is deleted", async () => {
    const id = await newClimber(otherGymId);
    session.climberId = id;
    await saveMyBankAccount(account);
    await db.climber.delete({ where: { id } });
    expect(await db.bankAccount.count({ where: { climberId: id } })).toBe(0);
  });
});

describe("the desk adding a bank account for a member", () => {
  it("saves, changes and removes it for a climber of the staff member's gym", async () => {
    const id = await newClimber();
    session.staffSlug = SLUG;
    const saved = await saveClimberBankAccount(id, account);
    expect(saved).toMatchObject({ ok: true, account: { label: "RBC ••••7890" } });
    expect(await getBankAccountForStaff(id)).toMatchObject({ holderName: "Kim Lee", transitNumber: "01234" });

    await saveClimberBankAccount(id, { ...account, institutionNumber: "010", accountNumber: "7654321" });
    expect(await db.bankAccount.count({ where: { climberId: id } })).toBe(1);
    expect((await getBankAccountForStaff(id))?.label).toBe("CIBC ••••4321");

    expect(await removeClimberBankAccount(id)).toEqual({ ok: true, account: null });
    expect(await getBankAccountForStaff(id)).toBeNull();
  });

  it("refuses a climber of another gym", async () => {
    const id = await newClimber(otherGymId);
    session.staffSlug = SLUG;
    expect(await saveClimberBankAccount(id, account)).toMatchObject({ ok: false, message: "Climber not found." });
    expect(await getBankAccountForStaff(id)).toBeUndefined();
    expect(await db.bankAccount.count({ where: { climberId: id } })).toBe(0);
  });

  it("refuses someone who isn't staff, even the climber themselves", async () => {
    const id = await newClimber();
    session.climberId = id;
    await expect(saveClimberBankAccount(id, account)).rejects.toThrow("redirect /login");
    await expect(removeClimberBankAccount(id)).rejects.toThrow("redirect /login");
    expect(await db.bankAccount.count({ where: { climberId: id } })).toBe(0);
  });

  it("still checks the fields and the agreement", async () => {
    const id = await newClimber();
    session.staffSlug = SLUG;
    const result = await saveClimberBankAccount(id, { ...account, authorized: false });
    expect(result).toMatchObject({ ok: false, errors: { authorized: expect.any(String) } });
  });
});
