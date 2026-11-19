import { describe, expect, it } from "vitest";
import { bestMatches, searchScore } from "./search";

const rows = [
  { id: "1", name: "Jamie Chen", phone: "(250) 555-0101", studentId: "V00946178" },
  { id: "2", name: "Geoff Tremblay", phone: "(250) 555-0199", studentId: "V00123456" },
  { id: "3", name: "Jamie Smith", phone: "(604) 555-0123", studentId: "V00777777" },
];

describe("climber search", () => {
  it("finds a name with a typo", () => {
    expect(bestMatches(rows, "jamei chen", 8).map((r) => r.id)[0]).toBe("1");
  });

  it("finds by part of a phone number", () => {
    expect(bestMatches(rows, "0199", 8).map((r) => r.id)).toEqual(["2"]);
  });

  it("finds by V number, with or without the V, and forgives a typo", () => {
    expect(bestMatches(rows, "V00946178", 8).map((r) => r.id)).toEqual(["1"]);
    expect(bestMatches(rows, "v0094", 8).map((r) => r.id)).toEqual(["1"]);
    expect(bestMatches(rows, "00946178", 8).map((r) => r.id)).toEqual(["1"]);
    expect(bestMatches(rows, "V00946179", 8).map((r) => r.id)).toEqual(["1"]); // one wrong digit
    expect(bestMatches(rows, "V00946718", 8).map((r) => r.id)).toEqual(["1"]); // two digits swapped
    expect(bestMatches(rows, "V99999999", 8)).toEqual([]);
  });

  it("puts the exact V number first, ahead of near misses, even when the list is capped", () => {
    // Like the migration's placeholders: V90000001, V90000002, ... so many
    // climbers are one digit away from each other.
    const many = Array.from({ length: 60 }, (_, i) => ({
      id: String(i + 1),
      name: `Climber ${i + 1}`,
      phone: "",
      studentId: `V${90000000 + i + 1}`,
    })).reverse();
    expect(bestMatches(many, "V90000001", 8)[0]?.studentId).toBe("V90000001");
    expect(bestMatches(many, "90000012", 8)[0]?.studentId).toBe("V90000012");
  });

  it("returns nothing for an empty search and caps the results", () => {
    expect(bestMatches(rows, "  ", 8)).toEqual([]);
    expect(bestMatches(rows, "jamie", 1)).toHaveLength(1);
  });

  it("scores a non-match as 0", () => {
    expect(searchScore(rows[0], "zzz")).toBe(0);
  });
});
