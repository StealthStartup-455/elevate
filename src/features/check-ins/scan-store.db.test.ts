// Needs a Postgres database with the migrations applied (DATABASE_URL).
// Run with `npm run test:db`; CI runs it against its own database.
import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { SCAN_TTL_MS, saveScan, takeScan } from "./scan-store";

const SLUG = "test-scan-store";
let gymId = "";
let otherGymId = "";
let alex = "";
let sam = "";

beforeAll(async () => {
  await cleanUp();
  const gym = await db.gym.create({ data: { name: "Scan test gym", slug: SLUG } });
  const other = await db.gym.create({ data: { name: "Other gym", slug: `${SLUG}-other` } });
  gymId = gym.id;
  otherGymId = other.id;
  const person = { lastName: "Test", dateOfBirth: new Date("1990-01-01T00:00:00Z") };
  alex = (await db.climber.create({ data: { gymId, firstName: "Alex", ...person } })).id;
  sam = (await db.climber.create({ data: { gymId, firstName: "Sam", ...person } })).id;
});

beforeEach(async () => {
  await db.qrScan.deleteMany({ where: { gymId } });
});

afterAll(async () => {
  await cleanUp();
  await db.$disconnect();
});

async function cleanUp() {
  const gyms = await db.gym.findMany({ where: { slug: { startsWith: SLUG } } });
  const ids = gyms.map((g) => g.id);
  await db.qrScan.deleteMany({ where: { gymId: { in: ids } } });
  await db.climber.deleteMany({ where: { gymId: { in: ids } } });
  await db.gym.deleteMany({ where: { id: { in: ids } } });
}

describe("scan store", () => {
  it("returns nothing when no one has scanned", async () => {
    expect(await takeScan(gymId)).toBeUndefined();
  });

  it("shows each scan once, oldest first, so two climbers both reach the desk", async () => {
    await saveScan(gymId, alex);
    await new Promise((r) => setTimeout(r, 5));
    await saveScan(gymId, sam);
    expect((await takeScan(gymId))?.climberId).toBe(alex);
    expect((await takeScan(gymId))?.climberId).toBe(sam);
    expect(await takeScan(gymId)).toBeUndefined();
  });

  it("gives a scan to only one of two desks polling at the same moment", async () => {
    await saveScan(gymId, alex);
    const results = await Promise.all([takeScan(gymId), takeScan(gymId), takeScan(gymId)]);
    expect(results.filter(Boolean).map((r) => r?.climberId)).toEqual([alex]);
  });

  it("says when the climber scanned, for the scan-to-desk time", async () => {
    const before = Date.now();
    await saveScan(gymId, alex);
    const taken = await takeScan(gymId);
    expect(taken?.scannedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(taken?.scannedAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("ignores scans older than the time limit", async () => {
    await saveScan(gymId, alex);
    const later = new Date(Date.now() + SCAN_TTL_MS + 1000);
    expect(await takeScan(gymId, later)).toBeUndefined();
  });

  it("never shows another gym's scan", async () => {
    await saveScan(gymId, alex);
    expect(await takeScan(otherGymId)).toBeUndefined();
    expect((await takeScan(gymId))?.climberId).toBe(alex);
  });

  it("refuses a scan for a climber from another gym", async () => {
    await expect(saveScan(otherGymId, alex)).rejects.toThrow();
  });
});
