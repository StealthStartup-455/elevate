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
// succeeds while takenAt is still empty. Returns the climber's id and when
// they scanned, or undefined when nothing is waiting.
//
// `notBefore` is when the desk started watching (#91): a scan made before the
// desk page opened isn't shown, so opening the desk never pops up someone who
// scanned while nobody was looking.
export type TakenScan = { climberId: string; scannedAt: Date };

export async function takeScan(
  gymId: string,
  now: Date = new Date(),
  notBefore?: Date,
): Promise<TakenScan | undefined> {
  const oldest = now.getTime() - SCAN_TTL_MS;
  const since = new Date(notBefore ? Math.max(oldest, notBefore.getTime()) : oldest);
  for (let attempt = 0; attempt < 3; attempt++) {
    const next = await db.qrScan.findFirst({
      where: { gymId, takenAt: null, scannedAt: { gt: since } },
      orderBy: { scannedAt: "asc" },
      select: { id: true, climberId: true, scannedAt: true },
    });
    if (!next) return undefined;
    const { count } = await db.qrScan.updateMany({
      where: { id: next.id, takenAt: null },
      data: { takenAt: now },
    });
    if (count === 1) return { climberId: next.climberId, scannedAt: next.scannedAt };
    // Another desk took it first; look for the next one.
  }
  return undefined;
}
