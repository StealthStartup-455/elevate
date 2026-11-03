// Needs a Postgres database with the migrations applied (DATABASE_URL).
// Run with `npm run test:db`; CI runs it against its own database.
// A climber buying their own pass or membership (elevate-docs#58).
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

const SLUG = "test-membership";
const OTHER_SLUG = "test-membership-other";
const session = vi.hoisted(() => ({ climberId: null as string | null, staff: false, demo: true }));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));
vi.mock("@/features/auth/queries", () => ({
  getSessionClimberId: async () => session.climberId,
  // getClimber lets a signed-in climber read their own record.
  getCurrentUser: async () =>
    session.climberId ? { authUserId: "test", staff: null, climberIds: [session.climberId] } : null,
}));
vi.mock("@/features/auth/session", () => ({ getDemoClimberId: async () => null }));
vi.mock("@/features/auth/staff", () => ({
  isStaff: async () => session.staff,
  requireStaff: async () => {
    if (!session.staff) throw new Error("redirect /login");
  },
  getStaffContext: async () =>
    session.staff
      ? { id: null, gymId: (await db.gym.findUniqueOrThrow({ where: { slug: SLUG } })).id, role: "DESK" }
      : null,
}));
// Buying in the app is a mock, so it only works in demo mode (#45).
vi.mock("@/features/auth/demo-mode", () => ({ isDemoMode: () => session.demo }));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn() }));
// The climber's own gym is read by id; the old "the" gym must not be used (#34).
vi.mock("@/lib/gym", () => ({
  getGym: async () => {
    throw new Error("getGym() must not be used: take the climber's own gym");
  },
  getGymById: async (id: string) => db.gym.findUnique({ where: { id } }),
}));

const { buyOnline } = await import("./actions");
const { getPurchasePage, isOnlinePurchaseEnabled } = await import("./queries");
const { recordSale } = await import("@/features/pos/actions");

let gymId = "";
const productIds: Record<string, string> = {};

beforeAll(async () => {
  await cleanUp();
  gymId = (await db.gym.create({ data: { name: "Membership test gym", slug: SLUG } })).id;
  const products = [
    { name: "Day pass", kind: "DAY" as const, priceCents: 2500 },
    { name: "1 month membership", kind: "MEMBERSHIP" as const, priceCents: 10000, durationMonths: 1 },
    { name: "Shoe rental", kind: "RENTAL" as const, priceCents: 600, chargesPst: true },
    { name: "Chalk", kind: "RETAIL" as const, priceCents: 500, chargesPst: true },
    { name: "Old pass", kind: "DAY" as const, priceCents: 1000, active: false },
    { name: "Punch card", kind: "PUNCH" as const, priceCents: 12000, punches: 10 },
  ];
  for (const p of products) {
    productIds[p.name] = (await db.product.create({ data: { gymId, ...p } })).id;
  }
});

beforeEach(() => {
  session.climberId = null;
  session.staff = false;
  session.demo = true;
});

afterAll(async () => {
  await cleanUp();
  await db.$disconnect();
});

async function cleanUp() {
  for (const slug of [SLUG, OTHER_SLUG]) await cleanUpGym(slug);
}

async function cleanUpGym(slug: string) {
  const gym = await db.gym.findUnique({ where: { slug } });
  if (!gym) return;
  const where = { where: { gymId: gym.id } };
  await db.pass.deleteMany(where);
  await db.saleLine.deleteMany(where);
  await db.sale.deleteMany(where);
  await db.product.deleteMany(where);
  await db.waiver.deleteMany(where);
  await db.climber.deleteMany(where);
  await db.gym.delete({ where: { id: gym.id } });
}

// A climber who has joined but not signed the waiver, like a new sign-up.
async function newClimber(): Promise<string> {
  const { id } = await db.climber.create({
    data: { gymId, firstName: "Joined", lastName: "Climber", dateOfBirth: new Date("1995-01-01T00:00:00Z") },
  });
  return id;
}

const buy = (name: string, key = randomUUID(), quantity?: number) =>
  buyOnline({ items: [{ productId: productIds[name], quantity }], idempotencyKey: key });

// An order of several lines: [name, quantity] pairs.
const order = (lines: [string, number?][], key = randomUUID()) =>
  buyOnline({ items: lines.map(([name, quantity]) => ({ productId: productIds[name], quantity })), idempotencyKey: key });

describe("buyOnline", () => {
  it("sells a membership to a climber with no waiver, as an ONLINE sale with GST", async () => {
    const id = await newClimber();
    session.climberId = id;
    const result = await buy("1 month membership");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 100.00 plus 5% GST.
    expect(result.totalCents).toBe(10500);
    expect(result.tender).toBe("ONLINE");

    const sale = await db.sale.findUniqueOrThrow({ where: { id: result.saleId } });
    expect(sale).toMatchObject({ climberId: id, staffId: null, tender: "ONLINE", status: "PAID" });
    expect(await db.pass.count({ where: { gymId, climberId: id, kind: "MEMBERSHIP" } })).toBe(1);
  });

  it("refuses an active member, whatever the buttons say", async () => {
    const id = await newClimber();
    session.climberId = id;
    expect((await buy("1 month membership")).ok).toBe(true);
    const again = await buy("Day pass");
    expect(again).toEqual({
      ok: false,
      message: "You already have an active membership, so you don't need a day pass.",
    });
    expect(await db.sale.count({ where: { gymId, climberId: id } })).toBe(1);
  });

  it("still sells rentals and chalk to an active member", async () => {
    const id = await newClimber();
    session.climberId = id;
    expect((await buy("1 month membership")).ok).toBe(true);
    const rental = await buy("Shoe rental", randomUUID(), 2);
    expect(rental.ok).toBe(true);
    if (!rental.ok) return;
    // 2 × 6.00 = 12.00, plus 5% GST (0.60) and 7% PST (0.84), and no pass comes with it.
    expect(rental.totalCents).toBe(1344);
    const rentalSale = await db.sale.findUniqueOrThrow({ where: { id: rental.saleId } });
    expect(rentalSale).toMatchObject({ gstCents: 60, pstCents: 84, gstRateBps: 500, pstRateBps: 700 });
    expect((await buy("Chalk")).ok).toBe(true);
    expect(await db.pass.count({ where: { gymId, climberId: id } })).toBe(1);
    expect(await db.sale.count({ where: { gymId, climberId: id, tender: "ONLINE" } })).toBe(3);
  });

  it("keeps rentals to 1 to 20, and a pass to one", async () => {
    session.climberId = await newClimber();
    const before = await db.sale.count({ where: { gymId } });
    expect((await buy("Shoe rental", randomUUID(), 0)).ok).toBe(false);
    expect((await buy("Shoe rental", randomUUID(), 21)).ok).toBe(false);
    expect((await buy("Shoe rental", randomUUID(), 1.5)).ok).toBe(false);
    expect((await buy("Day pass", randomUUID(), 2)).ok).toBe(false);
    expect(await db.sale.count({ where: { gymId } })).toBe(before);
    expect((await buy("Shoe rental", randomUUID(), 20)).ok).toBe(true);
  });

  it("sells several rentals and chalk in one checkout", async () => {
    const id = await newClimber();
    session.climberId = id;
    const result = await order([["Shoe rental", 2], ["Chalk", 3]]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 2 × 6.00 + 3 × 5.00 = 27.00, plus 5% GST (1.35) and 7% PST (1.89).
    expect(result.totalCents).toBe(3024);
    expect(await db.sale.count({ where: { gymId, climberId: id } })).toBe(1);
    const lines = await db.saleLine.findMany({ where: { sale: { climberId: id } }, orderBy: { name: "asc" } });
    expect(lines.map((l) => [l.name, l.quantity])).toEqual([["Chalk", 3], ["Shoe rental", 2]]);
  });

  it("sells one membership or pass together with rentals in one checkout", async () => {
    const id = await newClimber();
    session.climberId = id;
    const result = await order([["Day pass"], ["Shoe rental", 2], ["Chalk", 3]]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 25.00 + 27.00 = 52.00, GST 2.60, PST 1.89 on the 27.00 of goods.
    expect(result.totalCents).toBe(5649);
    expect(await db.sale.count({ where: { gymId, climberId: id } })).toBe(1);
    expect(await db.pass.count({ where: { gymId, climberId: id } })).toBe(1);
  });

  it("refuses an order with more than one membership or pass, not only in the page", async () => {
    const id = await newClimber();
    session.climberId = id;
    const notice = "An order can have one membership or pass. Buy the other one separately.";
    expect(await order([["Day pass"], ["1 month membership"]])).toEqual({ ok: false, message: notice });
    expect(await order([["Day pass"], ["Punch card"]])).toEqual({ ok: false, message: notice });
    expect(await order([["1 month membership"], ["Punch card"], ["Chalk", 2]])).toEqual({ ok: false, message: notice });
    expect(await db.sale.count({ where: { gymId, climberId: id } })).toBe(0);
    expect(await db.pass.count({ where: { gymId, climberId: id } })).toBe(0);
  });

  it("refuses an empty order, or the same item listed twice", async () => {
    const id = await newClimber();
    session.climberId = id;
    expect((await buyOnline({ items: [], idempotencyKey: randomUUID() })).ok).toBe(false);
    expect((await order([["Chalk", 1], ["Chalk", 1]])).ok).toBe(false);
    expect(await db.sale.count({ where: { gymId, climberId: id } })).toBe(0);
  });

  it("shows the new membership on the Purchase tab", async () => {
    const id = await newClimber();
    session.climberId = id;
    expect((await buy("1 month membership")).ok).toBe(true);
    const page = await getPurchasePage();
    expect(page?.membership.status).toBe("active");
    expect(page?.current?.name).toBe("1 month membership");
    expect(page?.purchases).toHaveLength(1);
    // A membership is GST only (no PST).
    expect(page?.purchases[0]).toMatchObject({ items: "1 month membership", totalCents: 10500, tender: "ONLINE" });
    // Everything that is for sale is offered (the inactive product is not).
    expect(page?.products.map((p) => p.name).sort()).toEqual([
      "1 month membership",
      "Chalk",
      "Day pass",
      "Punch card",
      "Shoe rental",
    ]);
  });

  it("saves one purchase when the pay button is pressed twice", async () => {
    const id = await newClimber();
    session.climberId = id;
    const key = randomUUID();
    const [a, b] = await Promise.all([buy("Day pass", key), buy("Day pass", key)]);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.saleId).toBe(b.saleId);
    expect(await db.sale.count({ where: { gymId, climberId: id } })).toBe(1);
    expect(await db.pass.count({ where: { gymId, climberId: id } })).toBe(1);
  });

  it("is closed outside demo mode: the mock checkout can't hand out a membership", async () => {
    const id = await newClimber();
    session.climberId = id;
    session.demo = false;
    const result = await buy("1 month membership");
    expect(result.ok).toBe(false);
    expect(await db.sale.count({ where: { gymId, climberId: id } })).toBe(0);
    expect(await db.pass.count({ where: { gymId, climberId: id } })).toBe(0);
    // And the tab and page are off too.
    expect(await isOnlinePurchaseEnabled()).toBe(false);
    expect(await getPurchasePage()).toBeNull();
  });

  it("shows the tab in demo mode, for the climber's own gym", async () => {
    session.climberId = await newClimber();
    expect(await isOnlinePurchaseEnabled()).toBe(true);
  });

  it("sells from the climber's own gym only, never another gym's products", async () => {
    const other = await db.gym.create({ data: { name: "Other gym", slug: OTHER_SLUG } });
    const theirDay = await db.product.create({
      data: { gymId: other.id, name: "Their day pass", kind: "DAY", priceCents: 1800 },
    });
    // Signed in as a climber of the test gym: the other gym's product isn't theirs to buy.
    session.climberId = await newClimber();
    const refused = await buyOnline({ items: [{ productId: theirDay.id }], idempotencyKey: randomUUID() });
    expect(refused.ok).toBe(false);
    expect(await db.sale.count({ where: { gymId: other.id } })).toBe(0);

    // A climber of the other gym buys there, at that gym's price and tax rates.
    const { id } = await db.climber.create({
      data: { gymId: other.id, firstName: "Other", lastName: "Gym", dateOfBirth: new Date("1990-01-01T00:00:00Z") },
    });
    session.climberId = id;
    const bought = await buyOnline({ items: [{ productId: theirDay.id }], idempotencyKey: randomUUID() });
    expect(bought.ok).toBe(true);
    const sale = await db.sale.findFirstOrThrow({ where: { gymId: other.id, climberId: id } });
    expect(sale).toMatchObject({ gymId: other.id, staffId: null, tender: "ONLINE" });
  });

  it("refuses when nobody is signed in", async () => {
    const before = await db.sale.count({ where: { gymId } });
    const result = await buy("Day pass");
    expect(result.ok).toBe(false);
    expect(await db.sale.count({ where: { gymId } })).toBe(before);
  });

  it("buys for the signed-in climber only, whatever the request says", async () => {
    const me = await newClimber();
    const other = await newClimber();
    session.climberId = me;
    // The action takes no climber id; an extra one in the request is ignored.
    const forged = { items: [{ productId: productIds["Day pass"] }], idempotencyKey: randomUUID(), climberId: other };
    const result = await buyOnline(forged);
    expect(result.ok).toBe(true);
    expect(await db.sale.count({ where: { gymId, climberId: me } })).toBe(1);
    expect(await db.sale.count({ where: { gymId, climberId: other } })).toBe(0);
  });

  it("won't replay another climber's purchase for the same key", async () => {
    const first = await newClimber();
    const second = await newClimber();
    const key = randomUUID();
    session.climberId = first;
    expect((await buy("Day pass", key)).ok).toBe(true);
    session.climberId = second;
    const result = await buy("Day pass", key);
    expect(result.ok).toBe(false);
    expect(await db.sale.count({ where: { gymId, climberId: second } })).toBe(0);
  });

  it("doesn't sell inactive products or made-up ids", async () => {
    session.climberId = await newClimber();
    const before = await db.sale.count({ where: { gymId } });
    expect((await buy("Old pass")).ok).toBe(false);
    expect((await buyOnline({ items: [{ productId: randomUUID() }], idempotencyKey: randomUUID() })).ok).toBe(false);
    expect((await buyOnline({ items: [{ productId: "nope" }], idempotencyKey: randomUUID() })).ok).toBe(false);
    expect(await db.sale.count({ where: { gymId } })).toBe(before);
  });

  it("keeps ONLINE out of the desk's Tender", async () => {
    const id = await newClimber();
    session.staff = true;
    const result = await recordSale({
      climberId: id,
      items: [{ productId: productIds["Day pass"], quantity: 1 }],
      tender: "ONLINE",
      idempotencyKey: randomUUID(),
    });
    expect(result.ok).toBe(false);
    expect(await db.sale.count({ where: { gymId, climberId: id } })).toBe(0);
  });
});
