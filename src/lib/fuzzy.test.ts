import { describe, expect, it } from "vitest";
import { fuzzyScore } from "./fuzzy";

const name = "Geoff Newman 250-555-0142";

describe("fuzzyScore", () => {
  it("matches a substring", () => {
    expect(fuzzyScore(name, "newman")).toBeGreaterThan(0);
  });

  it("matches a typo of four letters or more", () => {
    expect(fuzzyScore(name, "newmn")).toBeGreaterThan(0);
    expect(fuzzyScore("Jamie Chen", "jamei")).toBeGreaterThan(0);
  });

  it("matches letters in order across words", () => {
    expect(fuzzyScore("Jamie Chen", "jmch")).toBeGreaterThan(0);
  });

  it("matches words in any order", () => {
    expect(fuzzyScore("Jamie Chen", "chen jam")).toBeGreaterThan(0);
  });

  it("matches part of a phone number", () => {
    expect(fuzzyScore(name, "0142")).toBeGreaterThan(0);
  });

  it("ignores accents and case", () => {
    expect(fuzzyScore("Zoë Côté", "zoe cote")).toBeGreaterThan(0);
  });

  it("returns 0 when any word doesn't match", () => {
    expect(fuzzyScore(name, "newman smith")).toBe(0);
  });

  it("ranks an exact substring above a typo", () => {
    expect(fuzzyScore(name, "newman")).toBeGreaterThan(fuzzyScore(name, "newmn"));
  });

  // Known gap from the Oct 17 app review (proposal item D2): names that sound
  // alike but are spelled differently don't match yet. Jeff and Geoff is the
  // example from our front desk interview. Turn these into real tests when
  // sound-alike matching is added.
  it.todo("matches a name that sounds the same (jeff finds Geoff)");
  it.todo("matches common nicknames (kate finds Katherine)");
});
