import { describe, expect, it } from "vitest";
import { bestMatches, searchScore } from "./search";

const rows = [
  { id: "1", name: "Jamie Chen", phone: "(250) 555-0101" },
  { id: "2", name: "Geoff Tremblay", phone: "(250) 555-0199" },
  { id: "3", name: "Jamie Smith", phone: "(604) 555-0123" },
];

describe("climber search", () => {
  it("finds a name with a typo", () => {
    expect(bestMatches(rows, "jamei chen", 8).map((r) => r.id)[0]).toBe("1");
  });

  it("finds by part of a phone number", () => {
    expect(bestMatches(rows, "0199", 8).map((r) => r.id)).toEqual(["2"]);
  });

  it("returns nothing for an empty search and caps the results", () => {
    expect(bestMatches(rows, "  ", 8)).toEqual([]);
    expect(bestMatches(rows, "jamie", 1)).toHaveLength(1);
  });

  it("scores a non-match as 0", () => {
    expect(searchScore(rows[0], "zzz")).toBe(0);
  });
});
