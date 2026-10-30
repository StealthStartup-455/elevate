import { describe, expect, it } from "vitest";
import { climberScanMessages, deskNextStep, type ScanStatus } from "./scan-messages";

const ok: ScanStatus = { waiverStatus: "valid", membershipStatus: "active", hasDayPass: false };

describe("climberScanMessages", () => {
  it("says nothing when the climber can check in", () => {
    expect(climberScanMessages(ok)).toEqual([]);
  });

  it.each([
    [{ waiverStatus: "missing" }, "sign a waiver"],
    [{ waiverStatus: "expired" }, "waiver has expired"],
    [{ membershipStatus: "none" }, "day pass or membership"],
    [{ membershipStatus: "expired" }, "membership has ended"],
    [{ membershipStatus: "paused" }, "membership is paused"],
  ] as const)("has a message for %o", (change, text) => {
    const messages = climberScanMessages({ ...ok, ...change });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain(text);
    // Never blames the climber: every message says the desk will help.
    expect(messages[0]).toMatch(/they'll help you/i);
  });

  it("lists both problems, and a day pass covers the membership", () => {
    const both = { waiverStatus: "missing", membershipStatus: "none", hasDayPass: false } as const;
    expect(climberScanMessages(both)).toHaveLength(2);
    expect(climberScanMessages({ ...both, hasDayPass: true })).toHaveLength(1);
    expect(climberScanMessages({ ...both, punchesLeft: 3 })).toHaveLength(1);
  });
});

describe("deskNextStep", () => {
  it("is null when the climber can check in", () => {
    expect(deskNextStep(ok)).toBeNull();
    expect(deskNextStep({ ...ok, membershipStatus: "none", hasDayPass: true })).toBeNull();
    expect(deskNextStep({ ...ok, membershipStatus: "expired", punchesLeft: 1 })).toBeNull();
  });

  it.each([
    [{ waiverStatus: "missing" }, "Next: sign the waiver with them."],
    [{ waiverStatus: "expired" }, "Next: sign a new waiver with them."],
    [{ membershipStatus: "none" }, "Next: give a day pass, or sell a membership."],
    [{ membershipStatus: "expired" }, "Next: give a day pass, or renew their membership."],
    [{ membershipStatus: "paused" }, "Next: give a day pass, or restart their membership."],
  ] as const)("offers a fix for %o", (change, step) => {
    expect(deskNextStep({ ...ok, ...change })).toBe(step);
  });

  it("asks for the waiver before the day pass", () => {
    expect(deskNextStep({ waiverStatus: "missing", membershipStatus: "none", hasDayPass: false })).toBe(
      "Next: sign the waiver with them, then give a day pass.",
    );
  });
});
