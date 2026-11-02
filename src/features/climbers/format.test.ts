import { describe, expect, it } from "vitest";
import { membershipDateLine } from "./format";

describe("membershipDateLine", () => {
  it("says a recurring plan renews", () => {
    expect(membershipDateLine("active", "2026-11-30", true)).toBe("Renews Nov 30, 2026");
  });

  it("says a one-off plan runs until its end date (issue 132)", () => {
    expect(membershipDateLine("active", "2026-11-30", false)).toBe("Runs until Nov 30, 2026");
  });

  it("says when an expired one ended", () => {
    expect(membershipDateLine("expired", "2026-09-17", true, false)).toBe("Ended Sep 17");
  });

  it("gives no date for a paused membership (issue 124) or no membership", () => {
    expect(membershipDateLine("paused", "2026-11-19", true)).toBeNull();
    expect(membershipDateLine("none", undefined, false)).toBeNull();
  });
});
