import { describe, expect, it } from "vitest";
import { initials, newArrivals, scanResult } from "./scan-toast";

const ok = {
  waiverStatus: "valid",
  membershipStatus: "active",
  hasDayPass: false,
  punchesLeft: 0,
} as const;

describe("scanResult", () => {
  it("is ready with a valid waiver and an active membership", () => {
    const r = scanResult(ok);
    expect(r.ready).toBe(true);
    expect(r.label).toBe("Ready to check in");
    expect(r.label).not.toMatch(/checked in/i);
    expect(r.reasons).toEqual([]);
    expect(r.nextStep).toBeNull();
  });

  it("is ready on a day pass or punch card without a membership", () => {
    expect(scanResult({ ...ok, membershipStatus: "none", hasDayPass: true }).ready).toBe(true);
    expect(scanResult({ ...ok, membershipStatus: "expired", punchesLeft: 2 }).ready).toBe(true);
  });

  it("names a missing or expired waiver", () => {
    expect(scanResult({ ...ok, waiverStatus: "missing" }).reasons).toEqual(["No waiver signed"]);
    const expired = scanResult({ ...ok, waiverStatus: "expired" });
    expect(expired.ready).toBe(false);
    expect(expired.reasons).toEqual(["Waiver expired"]);
    expect(expired.nextStep).toBe("Next: sign a new waiver with them.");
  });

  it("names missing access and both problems together", () => {
    const r = scanResult({ ...ok, waiverStatus: "missing", membershipStatus: "paused" });
    expect(r.label).toBe("Can't check in yet");
    expect(r.reasons).toEqual(["No waiver signed", "Membership paused, and no day pass or punch card"]);
    expect(r.nextStep).toBe("Next: sign the waiver with them, then give a day pass.");
  });
});

describe("newArrivals", () => {
  it("returns only scans this desk hasn't announced, so polling doesn't replay sounds", () => {
    const waiting = [{ scanId: "a" }, { scanId: "b" }, { scanId: "c" }];
    expect(newArrivals(waiting, new Set(["a", "c"]))).toEqual([{ scanId: "b" }]);
    expect(newArrivals(waiting, new Set(["a", "b", "c"]))).toEqual([]);
  });
});

describe("initials", () => {
  it("uses the first and last name", () => {
    expect(initials("Jesse Scan")).toBe("JS");
    expect(initials("Ana Maria Lopez")).toBe("AL");
    expect(initials("Cher")).toBe("C");
    expect(initials("  ")).toBe("?");
  });
});
