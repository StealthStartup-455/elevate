import { db } from "@/lib/db";

// QR scans waiting for the front desk, kept in the database (QrScan table).
// Server memory doesn't work once the app runs on more than one server
// (serverless hosting): the phone's request and the desk's request can land
// on different instances. The database also keeps every scan, so two climbers
// scanning a few seconds apart both reach the desk.
//
// A scan waits until staff deal with it (check the person in, or close the
// popup), not just until a desk shows it (#127). So a scan isn't lost when the
// desk is on another page, reloads, or isn't open yet, and every open desk sees
// it. `takenAt` records when it was dealt with.

// A scan nobody has dealt with within this long is stale and ignored, so an
// old scan never pops up hours later. Long enough for a desk to open, or for
// staff to finish what they were doing.
export const SCAN_TTL_MS = 5 * 60 * 1000;

export async function saveScan(gymId: string, climberId: string): Promise<void> {
  await db.qrScan.create({ data: { gymId, climberId } });
}

export type WaitingScan = { id: string; climberId: string; scannedAt: Date };

// The oldest scan still waiting at this gym, without taking it: every desk
// that asks gets the same one until someone deals with it.
export async function oldestWaitingScan(
  gymId: string,
  now: Date = new Date(),
): Promise<WaitingScan | undefined> {
  const scan = await db.qrScan.findFirst({
    where: { gymId, takenAt: null, scannedAt: { gt: new Date(now.getTime() - SCAN_TTL_MS) } },
    orderBy: { scannedAt: "asc" },
    select: { id: true, climberId: true, scannedAt: true },
  });
  return scan ?? undefined;
}

// Whether this scan is still waiting, so a desk showing it can close the
// popup when another desk has dealt with it.
export async function isScanWaiting(gymId: string, scanId: string, now: Date = new Date()) {
  const count = await db.qrScan.count({
    where: {
      id: scanId,
      gymId,
      takenAt: null,
      scannedAt: { gt: new Date(now.getTime() - SCAN_TTL_MS) },
    },
  });
  return count > 0;
}

// Marks this scan, and any other waiting scan by the same climber (someone who
// tapped twice), as dealt with. Returns the scan, or undefined when it's not
// this gym's or was already dealt with (by another desk, for example).
export async function finishScan(
  gymId: string,
  scanId: string,
  now: Date = new Date(),
): Promise<WaitingScan | undefined> {
  const scan = await db.qrScan.findFirst({
    where: { id: scanId, gymId, takenAt: null },
    select: { id: true, climberId: true, scannedAt: true },
  });
  if (!scan) return undefined;
  const { count } = await db.qrScan.updateMany({
    where: { id: scan.id, takenAt: null },
    data: { takenAt: now },
  });
  if (count === 0) return undefined;
  await db.qrScan.updateMany({
    where: { gymId, climberId: scan.climberId, takenAt: null },
    data: { takenAt: now },
  });
  return scan;
}
