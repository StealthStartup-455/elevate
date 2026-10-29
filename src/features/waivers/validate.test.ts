import { describe, expect, it } from "vitest";
import { ageOn, parseWaiverSignature } from "./validate";

const NOW = new Date("2026-10-28T18:00:00Z");
const ADULT = { fullName: "Tyler Le", dateOfBirth: "2003-08-15" };
const CHILD = { fullName: "Nevin Gill", dateOfBirth: "2015-01-17" };
const SIGNATURE = "data:image/png;base64,iVBORw0KGgo=";

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(name, v);
  }
  return data;
}

// A correctly filled form for an adult; tests change one thing at a time.
const COMPLETE = {
  clause: ["0", "1", "2"],
  emergencyContactName: "Kim Le",
  emergencyContactPhone: "(250) 555-0199",
  signatureImage: SIGNATURE,
  agree: "on",
};

function errorsFor(fields: Record<string, string | string[]>, climber = ADULT) {
  const result = parseWaiverSignature(form(fields), climber, 3, NOW);
  return result.ok ? {} : result.errors;
}

describe("ageOn", () => {
  it("counts a birthday later this year as not yet reached", () => {
    expect(ageOn("2007-11-01", NOW)).toBe(18);
    expect(ageOn("2007-10-28", NOW)).toBe(19);
  });
});

describe("parseWaiverSignature", () => {
  it("accepts an adult who filled everything in", () => {
    expect(parseWaiverSignature(form(COMPLETE), ADULT, 3, NOW)).toEqual({
      ok: true,
      value: {
        signedByName: "Tyler Le",
        signerRelation: "SELF",
        signatureImage: SIGNATURE,
        emergencyContactName: "Kim Le",
        emergencyContactPhone: "+12505550199",
      },
    });
  });

  it("refuses when a rule isn't ticked", () => {
    expect(errorsFor({ ...COMPLETE, clause: ["0", "2"] }).clauses).toBeDefined();
  });

  it("needs a drawn signature", () => {
    expect(errorsFor({ ...COMPLETE, signatureImage: "" }).signatureImage).toBeDefined();
  });

  it("refuses a signature that isn't a PNG", () => {
    const html = "data:text/html;base64,PHNjcmlwdD4=";
    expect(errorsFor({ ...COMPLETE, signatureImage: html }).signatureImage).toBeDefined();
  });

  it("refuses a huge signature", () => {
    const huge = `data:image/png;base64,${"A".repeat(200_001)}`;
    expect(errorsFor({ ...COMPLETE, signatureImage: huge }).signatureImage).toBeDefined();
  });

  it("needs an emergency contact with a real phone number", () => {
    expect(errorsFor({ ...COMPLETE, emergencyContactName: "" }).emergencyContactName).toBeDefined();
    expect(errorsFor({ ...COMPLETE, emergencyContactPhone: "555" }).emergencyContactPhone).toBeDefined();
  });

  it("refuses without the electronic signature agreement", () => {
    expect(errorsFor({ ...COMPLETE, agree: "" }).agree).toBeDefined();
  });

  it("needs a parent or guardian for a minor", () => {
    const errors = errorsFor(COMPLETE, CHILD);
    expect(errors.guardianName).toBeDefined();
    expect(errors.signerRelation).toBeDefined();
  });

  it("accepts a parent signing for a minor", () => {
    const result = parseWaiverSignature(
      form({ ...COMPLETE, guardianName: "Ekam Gill", signerRelation: "PARENT" }),
      CHILD,
      3,
      NOW,
    );
    expect(result).toMatchObject({
      ok: true,
      value: { signedByName: "Ekam Gill", signerRelation: "PARENT" },
    });
  });
});
