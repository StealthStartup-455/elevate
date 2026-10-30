// Needs a Postgres database with the migrations applied (DATABASE_URL).
// Run with `npm run test:db`; CI runs it against its own database.
// The desk POS: Tender saves a sale and its passes once, Void ends them, and
// a punch card bought here gets the climber in.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

const SLUG = "test-pos";
const auth = vi.hoisted(() => ({ staff: true }));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));
vi.mock("@/features/auth/staff", () => ({
  isStaff: async () => auth.staff,
  requireStaff: async () => {
    if (!auth.staff) throw new Error("redirect /login");
  },
  getStaffContext: async () =>
    auth.staff
      ? { id: null, gymId: (await db.gym.findUniqueOrThrow({ where: { slug: SLUG } })).id, role: "DESK" }
      : null,
}));
vi.mock("@/features/auth/queries", () => ({ getSessionClimberId: async () => null }));
vi.mock("@/features/auth/session", () => ({ setSession: vi.fn() }));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn() }));
// Every query runs against the test gym, not the seeded one.
vi.mock("@/lib/gym", () => ({
  getGym: async () => db.gym.findUniqueOrThrow({ where: { slug: SLUG } }),
}));

const { recordSale, voidSale } = await import("./actions");
const { checkInClimber } = await import("@/features/climbers/actions");
const { getClimber } = await import("@/features/climbers/queries");

let gymId = "";
const productIds: Record<string, string> = {};

beforeAll(async () => {
  await cleanUp();
  gymId = (await db.gym.create({ data: { name: "POS test gym", slug: SLUG } })).id;
  const products = [
    { name: "Day pass", kind: "DAY" as const, priceCents: 2500 },
    { name: "10-punch card", kind: "PUNCH" as const, priceCents: 20000, punches: 10 },
    { name: "1 month membership", kind: "MEMBERSHIP" as const, priceCents: 10000, durationMonths: 1 },
    { name: "Monthly recurring", kind: "MEMBERSHIP" as const, priceCents: 8500, durationMonths: 1, recurring: true },
    { name: "Shoe rental", kind: "RENTAL" as const, priceCents: 600 },
    { name: "Old hoodie", kind: "RETAIL" as const, priceCents: 5000, active: false },
  ];
  for (const p of products) {
    productIds[p.name] = (await db.product.create({ data: { gymId, ...p } })).id;
  }
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
  await db.saleLine.deleteMany(where);
  await db.sale.deleteMany(where);
  await db.product.deleteMany(where);
  await db.waiver.deleteMany(where);
  await db.climber.deleteMany(where);
  await db.gym.delete({ where: { id: gym.id } });
}

async function newClimber(withWaiver = true): Promise<string> {
  const { id } = await db.climber.create({
    data: { gymId, firstName: "New", lastName: "Climber", dateOfBirth: new Date("1995-01-01T00:00:00Z") },
  });
  if (withWaiver) {
    await db.waiver.create({ data: { gymId, climberId: id, version: "v1", signedByName: "New Climber" } });
  }
  return id;
}

const sell = (climberId: string, items: [string, number][], key = randomUUID()) =>
  recordSale({
    climberId,
    items: items.map(([name, quantity]) => ({ productId: productIds[name], quantity })),
    tender: "CARD",
    idempotencyKey: key,
  });

describe("recordSale", () => {
  it("saves the sale with GST from the database prices, and gives the passes", async () => {
    const id = await newClimber();
    const result = await sell(id, [
      ["1 month membership", 1],
      ["Shoe rental", 2],
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 100.00 + 2 × 6.00 = 112.00, plus 5% GST = 117.60.
    expect(result.totalCents).toBe(11760);

    const sale = await db.sale.findUniqueOrThrow({ where: { id: result.saleId }, include: { lines: true } });
    expect(sale).toMatchObject({ subtotalCents: 11200, taxRateBps: 500, taxCents: 560, status: "PAID" });
    expect(sale.lines).toHaveLength(2);

    const climber = await getClimber(id);
    expect(climber?.membershipStatus).toBe("active");
    expect(await checkInClimber(id)).toEqual({ ok: true });
  });

  it("saves one sale when Tender is pressed twice", async () => {
    const id = await newClimber();
    const key = randomUUID();
    const [a, b] = await Promise.all([sell(id, [["Day pass", 1]], key), sell(id, [["Day pass", 1]], key)]);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.saleId).toBe(b.saleId);
    expect(await db.sale.count({ where: { gymId, climberId: id } })).toBe(1);
    expect(await db.pass.count({ where: { gymId, climberId: id } })).toBe(1);
  });

  it("starts a renewal when the current membership ends", async () => {
    const id = await newClimber();
    const first = await sell(id, [["1 month membership", 1]]);
    const second = await sell(id, [["1 month membership", 1]]);
    expect(first.ok && second.ok).toBe(true);
    const passes = await db.pass.findMany({ where: { gymId, climberId: id }, orderBy: { startsAt: "asc" } });
    expect(passes).toHaveLength(2);
    expect(passes[1].startsAt).toEqual(passes[0].expiresAt);
  });

  it("marks a monthly recurring membership as renewing", async () => {
    const id = await newClimber();
    await sell(id, [["Monthly recurring", 1]]);
    const pass = await db.pass.findFirstOrThrow({ where: { gymId, climberId: id } });
    expect(pass.renews).toBe(true);
  });

  it("sells to a climber with no waiver (the desk only warns)", async () => {
    const id = await newClimber(false);
    expect((await sell(id, [["Day pass", 1]])).ok).toBe(true);
  });

  it("refuses products that aren't for sale, bad quantities and two memberships", async () => {
    const id = await newClimber();
    expect((await sell(id, [["Old hoodie", 1]])).ok).toBe(false);
    expect((await sell(id, [["Day pass", 2]])).ok).toBe(false);
    expect(
      (
        await sell(id, [
          ["1 month membership", 1],
          ["Monthly recurring", 1],
        ])
      ).ok,
    ).toBe(false);
    expect(await db.sale.count({ where: { gymId, climberId: id } })).toBe(0);
  });

  it("is staff only", async () => {
    const id = await newClimber();
    auth.staff = false;
    await expect(sell(id, [["Day pass", 1]])).rejects.toThrow("redirect /login");
    expect(await db.sale.count({ where: { gymId, climberId: id } })).toBe(0);
  });
});

describe("punch cards", () => {
  it("let the climber in and lose a punch each visit", async () => {
    const id = await newClimber();
    expect((await checkInClimber(id)).ok).toBe(false);
    await sell(id, [["10-punch card", 1]]);
    expect((await getClimber(id))?.punchesLeft).toBe(10);

    expect(await checkInClimber(id)).toEqual({ ok: true });
    expect((await getClimber(id))?.punchesLeft).toBe(9);

    // Already in within two hours: no second punch.
    expect((await checkInClimber(id)).ok).toBe(false);
    expect((await getClimber(id))?.punchesLeft).toBe(9);
  });

  it("aren't used while a membership is active", async () => {
    const id = await newClimber();
    await sell(id, [
      ["10-punch card", 1],
      ["1 month membership", 1],
    ]);
    expect(await checkInClimber(id)).toEqual({ ok: true });
    expect((await getClimber(id))?.punchesLeft).toBe(10);
  });
});

describe("voidSale", () => {
  it("keeps the sale, marks it voided and ends its passes", async () => {
    const id = await newClimber();
    const result = await sell(id, [["1 month membership", 1]]);
    if (!result.ok) throw new Error(result.message);
    expect((await getClimber(id))?.membershipStatus).toBe("active");

    expect(await voidSale(result.saleId, "Wrong membership")).toEqual({ ok: true });
    const sale = await db.sale.findUniqueOrThrow({ where: { id: result.saleId } });
    expect(sale).toMatchObject({ status: "VOIDED", voidReason: "Wrong membership" });
    expect((await getClimber(id))?.membershipStatus).not.toBe("active");
    expect((await checkInClimber(id)).ok).toBe(false);

    // Twice is fine.
    expect(await voidSale(result.saleId, "Again")).toEqual({ ok: true });
  });

  it("takes the visits off a voided punch card", async () => {
    const id = await newClimber();
    const result = await sell(id, [["10-punch card", 1]]);
    if (!result.ok) throw new Error(result.message);
    await voidSale(result.saleId, "Rang up twice");
    expect((await getClimber(id))?.punchesLeft).toBe(0);
  });

  it("needs a reason", async () => {
    const id = await newClimber();
    const result = await sell(id, [["Day pass", 1]]);
    if (!result.ok) throw new Error(result.message);
    expect((await voidSale(result.saleId, "  ")).ok).toBe(false);
    expect((await db.sale.findUniqueOrThrow({ where: { id: result.saleId } })).status).toBe("PAID");
  });
});
