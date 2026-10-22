import { describe, expect, it } from "vitest";
import { parseClimberInput } from "./validate";

const NOW = new Date("2026-10-20T18:00:00Z");

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const VALID = {
  firstName: "Geoff",
  lastName: "Newman",
  phone: "250-555-0142",
  email: "Geoff.N@Example.com",
  dateOfBirth: "1995-03-03",
};

describe("parseClimberInput", () => {
  it("accepts a complete climber, trimmed, with the email lowercased", () => {
    const result = parseClimberInput(form({ ...VALID, firstName: "  Geoff " }), NOW);
    expect(result).toEqual({
      ok: true,
      value: { ...VALID, firstName: "Geoff", email: "geoff.n@example.com" },
    });
  });

  it("allows an empty email", () => {
    expect(parseClimberInput(form({ ...VALID, email: "" }), NOW).ok).toBe(true);
  });

  it("reports every missing required field", () => {
    const result = parseClimberInput(form({}), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ["dateOfBirth", "firstName", "lastName", "phone"].sort(),
      );
    }
  });

  it.each([
    ["phone", "555-0142"],
    ["email", "not-an-email"],
    ["dateOfBirth", "2024-02-31"],
    ["dateOfBirth", "2030-01-01"],
    ["dateOfBirth", "1899-12-31"],
    ["firstName", "x".repeat(61)],
  ])("rejects an invalid %s (%s)", (field, value) => {
    const result = parseClimberInput(form({ ...VALID, [field]: value }), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveProperty(field);
  });

  it("keeps what was typed so the form can show it again", () => {
    const result = parseClimberInput(form({ ...VALID, phone: "123" }), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.values.phone).toBe("123");
  });
});
