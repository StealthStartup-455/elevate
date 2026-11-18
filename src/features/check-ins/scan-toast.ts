import type { ScanStatus } from "./scan-messages";
import { deskNextStep, needsPass } from "./scan-messages";

// What a desk arrival toast says (#225). "Ready" only means everything needed
// to check in is valid: nobody is checked in until staff do it and the server
// confirms, so the wording never says "checked in".

export type ScanResult = {
  ready: boolean;
  /** Already checked in recently: a repeat scan, with nothing for staff to do. */
  alreadyIn: boolean;
  /** Short label for the status pill. */
  label: string;
  /** Each thing that stops them, in plain words. Empty when ready. */
  reasons: string[];
  /** What staff do next, or null when ready. */
  nextStep: string | null;
};

const MEMBERSHIP_REASON = {
  none: "No membership, day pass or punch card",
  expired: "Membership expired, and no day pass or punch card",
  paused: "Membership paused, and no day pass or punch card",
} as const;

export function scanResult(s: ScanStatus & { checkedInAt?: string }): ScanResult {
  // A repeat scan: checkInClimber would refuse another check-in, so don't
  // offer one or list what's missing (#225).
  if (s.checkedInAt) {
    return {
      ready: false,
      alreadyIn: true,
      label: `Already checked in at ${s.checkedInAt}`,
      reasons: [],
      nextStep: null,
    };
  }
  const reasons: string[] = [];
  if (s.waiverStatus === "missing") reasons.push("No waiver signed");
  if (s.waiverStatus === "expired") reasons.push("Waiver expired");
  if (needsPass(s) && s.membershipStatus !== "active") {
    reasons.push(MEMBERSHIP_REASON[s.membershipStatus]);
  }
  const ready = reasons.length === 0;
  return {
    ready,
    alreadyIn: false,
    label: ready ? "Ready to check in" : "Can't check in yet",
    reasons,
    nextStep: deskNextStep(s),
  };
}

// The scans this desk hasn't announced yet, oldest first. Polling returns the
// same waiting scans every few seconds, so only these get a toast and a sound.
export function newArrivals<T extends { scanId: string }>(
  waiting: T[],
  seen: ReadonlySet<string>,
): T[] {
  return waiting.filter((s) => !seen.has(s.scanId));
}

// "Jesse Scan" -> "JS", for the avatar placeholder when there is no photo.
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((p) => p[0]!.toUpperCase()).join("") || "?";
}
