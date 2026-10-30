import { describe, expect, it } from "vitest";
import { hashWaiver } from "./hash";

const WORDING = {
  title: "Release of liability",
  body: "Climbing is dangerous.\n\nYou climb at your own risk.",
  clauses: ["I understand climbing can cause serious injury."],
};

describe("hashWaiver", () => {
  it("gives the same hash for the same wording", () => {
    expect(hashWaiver({ ...WORDING })).toBe(hashWaiver(WORDING));
  });

  it("is a SHA-256 hex string", () => {
    expect(hashWaiver(WORDING)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when one letter of the body changes", () => {
    expect(hashWaiver({ ...WORDING, body: WORDING.body.replace("risk", "Risk") })).not.toBe(
      hashWaiver(WORDING),
    );
  });

  it("changes when a clause is added", () => {
    expect(hashWaiver({ ...WORDING, clauses: [...WORDING.clauses, "I will belay safely."] })).not.toBe(
      hashWaiver(WORDING),
    );
  });

  it("changes when words move from the title to the body", () => {
    const moved = { ...WORDING, title: "Release of", body: `liability ${WORDING.body}` };
    expect(hashWaiver(moved)).not.toBe(hashWaiver(WORDING));
  });
});
