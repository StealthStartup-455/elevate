import { db } from "@/lib/db";

// QR scans waiting for the front desk, kept in the database (QrScan table).
// Server memory doesn't work once the app runs on more than one server
// (serverless hosting): the phone's request and the desk's request can land
// on different instances. The database also keeps every scan, so two climbers
// scanning a few seconds apart both reach the desk.

// A scan the desk hasn't picked up within this long is stale and ignored,
// so an old scan never pops up hours later.
export const SCAN_TTL_MS = 2 * 60 * 1000;

export async function saveScan(gymId: string, climberId: string): Promise<void> {
  await db.qrScan.create({ data: { gymId, climberId } });
}

// Takes the oldest waiting scan for this gym and marks it taken, so each scan
// is shown once even if two desks poll at the same moment: the update only
// succeeds while takenAt is still empty. Returns the climber's id, or
// undefined when nothing is waiting.
export async function takeScan(gymId: string, now: Date = new Date()): Promise<string | undefined> {
  const since = new Date(now.getTime() - SCAN_TTL_MS);
  for (let attempt = 0; attempt < 3; attempt++) {
    const next = await db.qrScan.findFirst({
      where: { gymId, takenAt: null, scannedAt: { gt: since } },
      orderBy: { scannedAt: "asc" },
      select: { id: true, climberId: true },
    });
    if (!next) return undefined;
    const { count } = await db.qrScan.updateMany({
      where: { id: next.id, takenAt: null },
      data: { takenAt: now },
    });
    if (count === 1) return next.climberId;
    // Another desk took it first; look for the next one.
  }
  return undefined;
}
