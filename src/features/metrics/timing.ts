// What the desk's Check in dialog sends with a check in, so the value
// proposition metrics (#251) can say how long it took and what got in the way.
// Pure, so the browser and the server share it. The server never trusts it
// as is: parseCheckInTiming clamps and filters everything.

export type CheckInSourceName = "CAMERA" | "SEARCH" | "CLIMBER_PAGE";

// Why a picked climber couldn't be checked in yet. The same codes the server
// uses when it refuses (checkInClimber), so both count together.
export const BLOCKER_CODES = [
  "waiver_missing",
  "waiver_expired",
  "membership_none",
  "membership_expired",
  "membership_paused",
] as const;
export type BlockerCode = (typeof BLOCKER_CODES)[number];

export type CheckInTiming = {
  source: CheckInSourceName;
  /** From opening the dialog to now, measured in the browser. */
  elapsedMs?: number;
  /** The climber couldn't be checked in when staff picked them. */
  wasBlocked?: boolean;
  /** What blocked them, when wasBlocked. */
  blockers?: string[];
};

// Longer than this is a dialog left open, not a check in that took that long.
export const MAX_ELAPSED_MS = 10 * 60 * 1000;

const SOURCES: CheckInSourceName[] = ["CAMERA", "SEARCH", "CLIMBER_PAGE"];

export type ParsedTiming = {
  source: CheckInSourceName;
  elapsedMs: number | null;
  wasBlocked: boolean;
  reason: string | null;
};

/** Anything the browser sent, made safe to save. Unknown values are dropped. */
export function parseCheckInTiming(raw: unknown): ParsedTiming {
  const t = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const source = SOURCES.includes(t.source as CheckInSourceName)
    ? (t.source as CheckInSourceName)
    : "CLIMBER_PAGE";
  const ms = typeof t.elapsedMs === "number" ? Math.round(t.elapsedMs) : NaN;
  const elapsedMs = Number.isFinite(ms) && ms >= 0 && ms <= MAX_ELAPSED_MS ? ms : null;
  const blockers = Array.isArray(t.blockers)
    ? [...new Set(t.blockers.filter((b): b is BlockerCode => BLOCKER_CODES.includes(b as BlockerCode)))]
    : [];
  const wasBlocked = t.wasBlocked === true;
  return {
    source,
    elapsedMs,
    wasBlocked,
    reason: wasBlocked && blockers.length ? blockers.sort().join(",") : null,
  };
}

/** The codes for what stops this climber being checked in, empty when nothing does. */
export function blockerCodes(c: {
  waiverStatus: string;
  membershipStatus: string;
  hasDayPass: boolean;
  punchesLeft: number;
}): BlockerCode[] {
  const codes: BlockerCode[] = [];
  if (c.waiverStatus === "missing") codes.push("waiver_missing");
  else if (c.waiverStatus !== "valid") codes.push("waiver_expired");
  if (c.membershipStatus !== "active" && !c.hasDayPass && c.punchesLeft === 0) {
    if (c.membershipStatus === "expired") codes.push("membership_expired");
    else if (c.membershipStatus === "paused") codes.push("membership_paused");
    else codes.push("membership_none");
  }
  return codes;
}
