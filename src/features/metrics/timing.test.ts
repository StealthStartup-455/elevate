import { describe, expect, it } from "vitest";
import { blockerCodes, MAX_ELAPSED_MS, parseCheckInTiming } from "./timing";

describe("parseCheckInTiming", () => {
  it("keeps a sensible timing from the dialog", () => {
    expect(
      parseCheckInTiming({ source: "CAMERA", elapsedMs: 3210.6, wasBlocked: true, blockers: ["waiver_missing", "membership_none"] }),
    ).toEqual({ source: "CAMERA", elapsedMs: 3211, wasBlocked: true, reason: "membership_none,waiver_missing" });
  });

  it("drops what the browser shouldn't decide", () => {
    expect(
      parseCheckInTiming({ source: "ADMIN", elapsedMs: -5, wasBlocked: "yes", blockers: ["<script>", "waiver_missing"] }),
    ).toEqual({ source: "CLIMBER_PAGE", elapsedMs: null, wasBlocked: false, reason: null });
    expect(parseCheckInTiming({ source: "SEARCH", elapsedMs: MAX_ELAPSED_MS + 1 }).elapsedMs).toBeNull();
    expect(parseCheckInTiming(undefined)).toEqual({ source: "CLIMBER_PAGE", elapsedMs: null, wasBlocked: false, reason: null });
  });
});

describe("blockerCodes", () => {
  const ok = { waiverStatus: "valid", membershipStatus: "active", hasDayPass: false, punchesLeft: 0 };

  it("is empty when the climber can be checked in", () => {
    expect(blockerCodes(ok)).toEqual([]);
    expect(blockerCodes({ ...ok, membershipStatus: "none", punchesLeft: 3 })).toEqual([]);
  });

  it("names each problem", () => {
    expect(blockerCodes({ ...ok, waiverStatus: "missing", membershipStatus: "expired" })).toEqual([
      "waiver_missing",
      "membership_expired",
    ]);
    expect(blockerCodes({ ...ok, waiverStatus: "expired", membershipStatus: "paused" })).toEqual([
      "waiver_expired",
      "membership_paused",
    ]);
  });
});
