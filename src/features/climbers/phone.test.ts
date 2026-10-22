import { describe, expect, it } from "vitest";
import { formatPhone, toStoredPhone } from "./phone";

describe("toStoredPhone", () => {
  it.each([
    ["250-555-0101", "+12505550101"],
    ["(250) 555 0101", "+12505550101"],
    ["+1 250 555 0101", "+12505550101"],
    ["+44 20 7946 0958", "+442079460958"],
  ])("%s is stored as %s", (input, stored) => {
    expect(toStoredPhone(input)).toBe(stored);
  });
});

describe("formatPhone", () => {
  it("shows North American numbers as 250-555-0101", () => {
    expect(formatPhone("+12505550101")).toBe("250-555-0101");
  });

  it("shows other numbers as stored", () => {
    expect(formatPhone("+442079460958")).toBe("+442079460958");
  });
});
