// Needs a Postgres database with the migrations applied (DATABASE_URL).
// Run with `npm run test:db`; CI runs it against its own database.
// The desk POS: Tender saves a sale and its passes once, Void ends them, and
// a punch card bought here gets the climber in.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { randomStudentId } from "@/features/climbers/student-id";

const SLUG = "test-pos";
// staffId null is the shared demo desk login.
// manager: a manager or owner, the only ones who can revoke (#254).
const auth = vi.hoisted(() => ({ staff: true, staffId: null as string | null, manager: true }));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));
vi.mock("@/features/auth/staff", () => ({
  isStaff: async () => auth.staff,
  getStaffContext: async () => (auth.staff ? { id: auth.staffId, gymId, role: auth.manager ? "MANAGER" : "DESK" } : null),
  isManager: async () => auth.staff && auth.manager,
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

const { findPosClimbers, getPosClimber, recordSale, revokeMembership, voidSale } = await import("./actions");
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
    { name: "Shoe rental", kind: "RENTAL" as const, priceCents: 600, chargesPst: true },
    { name: "Old hoodie", kind: "RETAIL" as const, priceCents: 5000, chargesPst: true, active: false },
  ];
  for (const p of products) {
    productIds[p.name] = (await db.product.create({ data: { gymId, ...p } })).id;
  }
});

beforeEach(() => {
  auth.staff = true;
  auth.staffId = null;
  auth.manager = true;
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
  await db.staff.deleteMany(where);
  await db.gym.delete({ where: { id: gym.id } });
}

async function newClimber(withWaiver = true): Promise<string> {
  const { id } = await db.climber.create({
    data: { studentId: randomStudentId(), gymId, firstName: "New", lastName: "Climber", dateOfBirth: new Date("1995-01-01T00:00:00Z") },
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
  it("saves the sale with GST and PST from the database prices, and gives the passes", async () => {
    const id = await newClimber();
    const result = await sell(id, [
      ["1 month membership", 1],
      ["Shoe rental", 2],
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 100.00 + 2 × 6.00 = 112.00, plus 5% GST (5.60) and 7% PST on the
    // 12.00 of rentals (0.84) = 118.44.
    expect(result.totalCents).toBe(11844);

    const sale = await db.sale.findUniqueOrThrow({ where: { id: result.saleId }, include: { lines: true } });
    expect(sale).toMatchObject({
      subtotalCents: 11200,
      gstRateBps: 500,
      gstCents: 560,
      pstRateBps: 700,
      pstCents: 84,
      totalCents: 11844,
      status: "PAID",
    });
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

describe("revokeMembership", () => {
  it("ends the membership and an early renewal now, and keeps the sales", async () => {
    const id = await newClimber();
    const first = await sell(id, [["Monthly recurring", 1]]);
    const renewal = await sell(id, [["Monthly recurring", 1]]);
    if (!first.ok || !renewal.ok) throw new Error("sale failed");
    expect((await getClimber(id))?.membershipStatus).toBe("active");

    expect(await revokeMembership(id, "Couldn't pay")).toEqual({ ok: true });
    expect((await getClimber(id))?.membershipStatus).not.toBe("active");
    expect((await checkInClimber(id)).ok).toBe(false);
    const passes = await db.pass.findMany({ where: { climberId: id, kind: "MEMBERSHIP" } });
    // The early renewal ends where it starts, so it never counts.
    expect(passes.every((p) => !p.renews && (p.expiresAt! <= new Date() || p.expiresAt! <= p.startsAt))).toBe(true);
    const sales = await db.sale.findMany({ where: { id: { in: [first.saleId, renewal.saleId] } } });
    expect(sales.every((s) => s.status === "PAID")).toBe(true);

    // The reason and when are saved on each pass; the demo desk login has no staff id.
    expect(passes.every((p) => p.revokeReason === "Couldn't pay" && p.revokedAt && p.revokedById === null)).toBe(true);

    // Twice is fine, and keeps the first reason.
    expect(await revokeMembership(id, "Again")).toEqual({ ok: true });
    const again = await db.pass.findMany({ where: { climberId: id, kind: "MEMBERSHIP" } });
    expect(again.every((p) => p.revokeReason === "Couldn't pay")).toBe(true);
  });

  it("leaves day passes and punch cards alone", async () => {
    const id = await newClimber();
    const result = await sell(id, [["1 month membership", 1], ["10-punch card", 1]]);
    if (!result.ok) throw new Error(result.message);
    await revokeMembership(id, "Injured");
    expect((await getClimber(id))?.punchesLeft).toBe(10);
  });

  it("needs a reason, trimmed and under 200 characters", async () => {
    const id = await newClimber();
    const result = await sell(id, [["1 month membership", 1]]);
    if (!result.ok) throw new Error(result.message);
    expect((await revokeMembership(id, "   ")).ok).toBe(false);
    expect((await revokeMembership(id, "x".repeat(201))).ok).toBe(false);
    expect((await getClimber(id))?.membershipStatus).toBe("active");

    expect((await revokeMembership(id, "  Moved away  ")).ok).toBe(true);
    const pass = await db.pass.findFirstOrThrow({ where: { climberId: id, kind: "MEMBERSHIP" } });
    expect(pass.revokeReason).toBe("Moved away");
  });

  it("records which staff member revoked it", async () => {
    const id = await newClimber();
    const result = await sell(id, [["1 month membership", 1]]);
    if (!result.ok) throw new Error(result.message);
    const staff = await db.staff.create({ data: { gymId, authUserId: crypto.randomUUID(), name: "Clinton" } });
    auth.staffId = staff.id;
    expect((await revokeMembership(id, "Couldn't pay")).ok).toBe(true);
    const pass = await db.pass.findFirstOrThrow({ where: { climberId: id, kind: "MEMBERSHIP" } });
    expect(pass.revokedById).toBe(staff.id);
  });

  it("is staff only", async () => {
    const id = await newClimber();
    auth.staff = false;
    await expect(revokeMembership(id, "Couldn't pay")).rejects.toThrow("redirect /login");
  });

  it("is managers and owners only: desk staff are refused", async () => {
    const id = await newClimber();
    const result = await sell(id, [["1 month membership", 1]]);
    if (!result.ok) throw new Error(result.message);
    auth.manager = false;
    expect(await revokeMembership(id, "Couldn't pay")).toEqual({
      ok: false,
      message: "Only managers and owners can revoke a membership.",
    });
    expect((await getClimber(id))?.membershipStatus).toBe("active");
  });
});

describe("POS climber search", () => {
  it("finds climbers in the staff member's gym only, with their passes", async () => {
    const id = await newClimber();
    await db.climber.update({ where: { id }, data: { firstName: "Searchable", lastName: "Zephyr" } });
    await sell(id, [["10-punch card", 1]]);
    const otherGym = await db.gym.create({ data: { name: "Other gym", slug: "test-pos-other" } });
    const other = await db.climber.create({
      data: { studentId: randomStudentId(), gymId: otherGym.id, firstName: "Searchable", lastName: "Zephyr", dateOfBirth: new Date("1995-01-01T00:00:00Z") },
    });
    try {
      const found = await findPosClimbers("Searchable Zephyr");
      expect(found.some((c) => c.id === id && c.punchesLeft === 10)).toBe(true);
      expect(found.some((c) => c.id === other.id)).toBe(false);
      expect(await getPosClimber(other.id)).toBeNull();
      expect((await getPosClimber(id))?.punchesLeft).toBe(10);
    } finally {
      await db.climber.delete({ where: { id: other.id } });
      await db.gym.delete({ where: { id: otherGym.id } });
    }
  });

  it("is staff only", async () => {
    auth.staff = false;
    await expect(findPosClimbers("New")).rejects.toThrow("redirect /login");
    await expect(getPosClimber(randomUUID())).rejects.toThrow("redirect /login");
  });
});
