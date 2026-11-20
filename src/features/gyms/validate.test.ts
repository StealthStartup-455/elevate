import { describe, expect, it } from "vitest";
import { parseGymInput, slugFromGymName } from "./validate";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("gym sign-up validation", () => {
  it("makes a stable, URL-safe slug from a gym name", () => {
    expect(slugFromGymName("  The Crag & Co.  ")).toBe("the-crag-co");
  });

  it("accepts a complete gym registration", () => {
    expect(
      parseGymInput(
        form({ gymName: "The Crag", ownerName: "Alex Climber", timeZone: "America/Vancouver" }),
      ),
    ).toEqual({ gymName: "The Crag", ownerName: "Alex Climber", timeZone: "America/Vancouver" });
  });

  it("uses the default time zone and refuses a name without URL-safe characters", () => {
    expect(
      parseGymInput(form({ gymName: "The Crag", ownerName: "Alex", timeZone: "Not/a-time-zone" })),
    ).toEqual({ gymName: "The Crag", ownerName: "Alex", timeZone: "America/Vancouver" });
    expect(parseGymInput(form({ gymName: "🏔", ownerName: "Alex", timeZone: "America/Vancouver" }))).toBeNull();
  });
});
