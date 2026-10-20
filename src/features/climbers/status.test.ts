import { describe, expect, it } from "vitest";
import { summarizeMembership, summarizeWaiver } from "./status";

const NOW = new Date("2026-10-20T18:00:00Z");
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("summarizeWaiver", () => {
  it("is missing when the climber never signed", () => {
    expect(summarizeWaiver(undefined, null, NOW)).toEqual({ status: "missing" });
  });

  it("is valid for a year after signing", () => {
    const result = summarizeWaiver({ signedAt: day("2026-03-01"), version: "v1" }, null, NOW);
    expect(result).toEqual({ status: "valid", expiresOn: "2027-03-01" });
  });

  it("is expired once the year has passed", () => {
    const result = summarizeWaiver({ signedAt: day("2025-10-01"), version: "v1" }, null, NOW);
    expect(result).toEqual({ status: "expired", expiresOn: "2026-10-01" });
  });

  it("counts an older wording as expired when the gym requires a version", () => {
    const result = summarizeWaiver({ signedAt: day("2026-09-01"), version: "v1" }, "v2", NOW);
    expect(result.status).toBe("expired");
  });

  it("accepts the required version", () => {
    const result = summarizeWaiver({ signedAt: day("2026-09-01"), version: "v2" }, "v2", NOW);
    expect(result.status).toBe("valid");
  });
});

describe("summarizeMembership", () => {
  const pass = (startsAt: string, expiresAt: string | null, pausedAt: string | null = null) => ({
    startsAt: day(startsAt),
    expiresAt: expiresAt ? day(expiresAt) : null,
    pausedAt: pausedAt ? day(pausedAt) : null,
  });

  it("is none without passes", () => {
    expect(summarizeMembership([], NOW)).toEqual({ status: "none" });
  });

  it("is active while the current pass runs", () => {
    expect(summarizeMembership([pass("2026-10-01", "2026-11-01")], NOW)).toEqual({
      status: "active",
      renewsOn: "2026-11-01",
    });
  });

  it("is active with no end date", () => {
    expect(summarizeMembership([pass("2026-01-01", null)], NOW)).toEqual({ status: "active" });
  });

  it("is expired after the end date", () => {
    expect(summarizeMembership([pass("2026-09-01", "2026-10-01")], NOW).status).toBe("expired");
  });

  it("is paused while on hold", () => {
    const result = summarizeMembership([pass("2026-10-01", "2026-11-01", "2026-10-10")], NOW);
    expect(result.status).toBe("paused");
  });

  // Regression test for the Oct 14 fix (fix/42-membership-status-future-pass):
  // a renewal bought early must not hide the membership in effect today.
  it("ignores a pass that has not started yet", () => {
    const result = summarizeMembership(
      [pass("2026-10-01", "2026-11-01"), pass("2026-11-01", "2026-12-01")],
      NOW,
    );
    expect(result).toEqual({ status: "active", renewsOn: "2026-11-01" });
  });

  it("is none when the only pass starts later", () => {
    expect(summarizeMembership([pass("2026-11-01", "2026-12-01")], NOW).status).toBe("none");
  });
});
