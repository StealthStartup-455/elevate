import type { MembershipStatus, WaiverStatus } from "@/features/climbers/types";

// What a scan with a problem says (#90): on the climber's phone, plain words
// that don't read as their fault and say the desk will help; on the desk, the
// fix to offer. One place, so the two never disagree.

export type ScanStatus = {
  waiverStatus: WaiverStatus;
  membershipStatus: MembershipStatus;
  hasDayPass: boolean;
  /** Visits left on punch cards; one lets them in without a membership. */
  punchesLeft?: number;
};

// A day pass or a punch card lets them in without an active membership.
function needsPass(s: ScanStatus): boolean {
  return s.membershipStatus !== "active" && !s.hasDayPass && !((s.punchesLeft ?? 0) > 0);
}

const WAIVER_MESSAGE: Record<Exclude<WaiverStatus, "valid">, string> = {
  missing: "They'll help you sign a waiver.",
  expired: "Your waiver has expired, so they'll help you sign a new one.",
};

const MEMBERSHIP_MESSAGE: Record<Exclude<MembershipStatus, "active">, string> = {
  none: "They'll help you with a day pass or membership.",
  expired: "Your membership has ended, so they'll help you renew or get a day pass.",
  paused: "Your membership is paused, so they'll help you with a day pass or restarting it.",
};

const MEMBERSHIP_FIX: Record<Exclude<MembershipStatus, "active">, string> = {
  none: "sell a membership",
  expired: "renew their membership",
  paused: "restart their membership",
};

// The climber's phone after a scan: one line per problem, empty if none.
export function climberScanMessages(s: ScanStatus): string[] {
  const list: string[] = [];
  if (s.waiverStatus !== "valid") list.push(WAIVER_MESSAGE[s.waiverStatus]);
  if (needsPass(s) && s.membershipStatus !== "active") {
    list.push(MEMBERSHIP_MESSAGE[s.membershipStatus]);
  }
  return list;
}

// The desk's next step, or null when the climber can check in. The waiver
// comes first: the day pass stopgap needs a valid waiver (#62).
export function deskNextStep(s: ScanStatus): string | null {
  const needsWaiver = s.waiverStatus !== "valid";
  const sign = s.waiverStatus === "expired" ? "sign a new waiver" : "sign the waiver";
  if (needsWaiver && needsPass(s)) return `Next: ${sign} with them, then give a day pass.`;
  if (needsWaiver) return `Next: ${sign} with them.`;
  if (needsPass(s) && s.membershipStatus !== "active") {
    return `Next: give a day pass, or ${MEMBERSHIP_FIX[s.membershipStatus]}.`;
  }
  return null;
}
