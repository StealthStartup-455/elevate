// Needs a Postgres database with the migrations applied (DATABASE_URL).
// Run with `npm run test:db`; CI runs it against its own database.
import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { finishScan, isScanWaiting, oldestWaitingScan, SCAN_TTL_MS, saveScan } from "./scan-store";

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
  it("has nothing waiting when no one has scanned", async () => {
    expect(await oldestWaitingScan(gymId)).toBeUndefined();
  });

  it("keeps a scan waiting until it's finished, so every desk and a reload see it (issue 127)", async () => {
    await saveScan(gymId, alex);
    const first = await oldestWaitingScan(gymId);
    expect(first?.climberId).toBe(alex);
    // A second desk, or the same desk after a reload, sees the same scan.
    expect((await oldestWaitingScan(gymId))?.id).toBe(first?.id);
    expect(await isScanWaiting(gymId, first!.id)).toBe(true);

    expect((await finishScan(gymId, first!.id))?.climberId).toBe(alex);
    expect(await oldestWaitingScan(gymId)).toBeUndefined();
    expect(await isScanWaiting(gymId, first!.id)).toBe(false);
  });

  it("shows scans oldest first, so two climbers both reach the desk", async () => {
    await saveScan(gymId, alex);
    await new Promise((r) => setTimeout(r, 5));
    await saveScan(gymId, sam);
    const first = await oldestWaitingScan(gymId);
    expect(first?.climberId).toBe(alex);
    await finishScan(gymId, first!.id);
    expect((await oldestWaitingScan(gymId))?.climberId).toBe(sam);
  });

  it("finishes a scan once, even when two desks finish it at the same moment", async () => {
    await saveScan(gymId, alex);
    const scan = await oldestWaitingScan(gymId);
    const results = await Promise.all([
      finishScan(gymId, scan!.id),
      finishScan(gymId, scan!.id),
      finishScan(gymId, scan!.id),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("clears a climber's repeat taps along with the scan staff dealt with", async () => {
    await saveScan(gymId, alex);
    await saveScan(gymId, alex);
    await saveScan(gymId, sam);
    const scan = await oldestWaitingScan(gymId);
    await finishScan(gymId, scan!.id);
    expect((await oldestWaitingScan(gymId))?.climberId).toBe(sam);
  });

  it("says when the climber scanned, for the scan-to-desk time", async () => {
    const before = Date.now();
    await saveScan(gymId, alex);
    const scan = await oldestWaitingScan(gymId);
    expect(scan?.scannedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(scan?.scannedAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("shows a scan made a little before the desk looked (issue 127)", async () => {
    await saveScan(gymId, alex);
    const aMinuteLater = new Date(Date.now() + 60 * 1000);
    expect((await oldestWaitingScan(gymId, aMinuteLater))?.climberId).toBe(alex);
  });

  it("ignores scans older than the time limit", async () => {
    await saveScan(gymId, alex);
    const later = new Date(Date.now() + SCAN_TTL_MS + 1000);
    expect(await oldestWaitingScan(gymId, later)).toBeUndefined();
  });

  it("never shows or finishes another gym's scan", async () => {
    await saveScan(gymId, alex);
    expect(await oldestWaitingScan(otherGymId)).toBeUndefined();
    const scan = await oldestWaitingScan(gymId);
    expect(await finishScan(otherGymId, scan!.id)).toBeUndefined();
    expect(await isScanWaiting(otherGymId, scan!.id)).toBe(false);
    expect((await oldestWaitingScan(gymId))?.id).toBe(scan!.id);
  });

  it("refuses a scan for a climber from another gym", async () => {
    await expect(saveScan(otherGymId, alex)).rejects.toThrow();
  });
});
