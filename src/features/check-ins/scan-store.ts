// Demo only: the latest QR scan, kept in server memory until the desk picks
// it up. Lost when the dev server restarts, which is fine for a demo.

export type Scan = {
  climberId: string;
  scannedAt: number;
};

// Kept on globalThis so dev hot reloads don't wipe it.
const store = globalThis as typeof globalThis & { __latestScan?: Scan };

export function saveScan(scan: Scan) {
  store.__latestScan = scan;
}

// Returns the latest scan once, then forgets it, so the desk shows it once.
export function takeScan(): Scan | undefined {
  const scan = store.__latestScan;
  store.__latestScan = undefined;
  return scan;
}
