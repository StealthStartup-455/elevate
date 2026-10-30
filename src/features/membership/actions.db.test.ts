// Needs a Postgres database with the migrations applied (DATABASE_URL).
// Run with `npm run test:db`; CI runs it against its own database.
// A climber buying their own pass or membership (elevate-docs#58).
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

const SLUG = "test-membership";
const session = vi.hoisted(() => ({ climberId: null as string | null, staff: false }));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));
vi.mock("@/features/auth/queries", () => ({ getSessionClimberId: async () => session.climberId }));
vi.mock("@/features/auth/staff", () => ({
  isStaff: async () => session.staff,
  requireStaff: async () => {
    if (!session.staff) throw new Error("redirect /login");
  },
}));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn() }));
// Every query runs against the test gym, not the seeded one.
vi.mock("@/lib/gym", () => ({
  getGym: async () => db.gym.findUniqueOrThrow({ where: { slug: SLUG } }),
}));

const { buyOnline } = await import("./actions");
const { getMembershipPage } = await import("./queries");
const { recordSale } = await import("@/features/pos/actions");

let gymId = "";
const productIds: Record<string, string> = {};

beforeAll(async () => {
  await cleanUp();
  gymId = (await db.gym.create({ data: { name: "Membership test gym", slug: SLUG } })).id;
  const products = [
    { name: "Day pass", kind: "DAY" as const, priceCents: 2500 },
    { name: "1 month membership", kind: "MEMBERSHIP" as const, priceCents: 10000, durationMonths: 1 },
    { name: "Shoe rental", kind: "RENTAL" as const, priceCents: 600 },
    { name: "Old pass", kind: "DAY" as const, priceCents: 1000, active: false },
  ];
  for (const p of products) {
    productIds[p.name] = (await db.product.create({ data: { gymId, ...p } })).id;
  }
});

beforeEach(() => {
  session.climberId = null;
  session.staff = false;
});

afterAll(async () => {
  await cleanUp();
  await db.$disconnect();
});

async function cleanUp() {
  const gym = await db.gym.findUnique({ where: { slug: SLUG } });
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

const buy = (name: string, key = randomUUID()) =>
  buyOnline({ productId: productIds[name], idempotencyKey: key });

describe("buyOnline", () => {
  it("sells a membership to a climber with no waiver, as an ONLINE sale with GST", async () => {
    const id = await newClimber();
    session.climberId = id;
    const result = await buyOnline({ productId: productIds["1 month membership"], idempotencyKey: randomUUID() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 100.00 plus 5% GST.
    expect(result.totalCents).toBe(10500);
    expect(result.tender).toBe("ONLINE");

    const sale = await db.sale.findUniqueOrThrow({ where: { id: result.saleId } });
    expect(sale).toMatchObject({ climberId: id, staffId: null, tender: "ONLINE", status: "PAID" });
    expect(await db.pass.count({ where: { gymId, climberId: id, kind: "MEMBERSHIP" } })).toBe(1);
  });

  it("shows the new membership on the Membership tab", async () => {
    const id = await newClimber();
    session.climberId = id;
    expect((await buy("1 month membership")).ok).toBe(true);
    const page = await getMembershipPage();
    expect(page?.membership.status).toBe("active");
    expect(page?.current?.name).toBe("1 month membership");
    expect(page?.purchases).toHaveLength(1);
    expect(page?.purchases[0]).toMatchObject({ items: "1 month membership", totalCents: 10500, tender: "ONLINE" });
    // Only passes and memberships are offered, and only the ones for sale.
    expect(page?.products.map((p) => p.name).sort()).toEqual(["1 month membership", "Day pass"]);
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
    const forged = { productId: productIds["Day pass"], idempotencyKey: randomUUID(), climberId: other };
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

  it("doesn't sell rentals, inactive products or made-up ids", async () => {
    session.climberId = await newClimber();
    const before = await db.sale.count({ where: { gymId } });
    expect((await buy("Shoe rental")).ok).toBe(false);
    expect((await buy("Old pass")).ok).toBe(false);
    expect((await buyOnline({ productId: randomUUID(), idempotencyKey: randomUUID() })).ok).toBe(false);
    expect((await buyOnline({ productId: "nope", idempotencyKey: randomUUID() })).ok).toBe(false);
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
