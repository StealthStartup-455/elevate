import { describe, expect, it } from "vitest";
import { ageOn, parseWaiverSignature, sameName } from "./validate";

const NOW = new Date("2026-10-28T18:00:00Z");
const ADULT = { fullName: "Tyler Le", dateOfBirth: "2003-08-15" };
const CHILD = { fullName: "Nevin Gill", dateOfBirth: "2015-01-17" };

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(name, v);
  }
  return data;
}

const ALL_CLAUSES = ["0", "1", "2"];

describe("ageOn", () => {
  it("counts a birthday later this year as not yet reached", () => {
    expect(ageOn("2007-11-01", NOW)).toBe(18);
    expect(ageOn("2007-10-28", NOW)).toBe(19);
  });
});

describe("sameName", () => {
  it("ignores case, extra spaces and accents", () => {
    expect(sameName("  josé  DE la Cruz ", "Jose de la Cruz")).toBe(true);
  });

  it("tells different names apart", () => {
    expect(sameName("Rob Smith", "Robert Smith")).toBe(false);
  });
});

describe("parseWaiverSignature", () => {
  it("accepts an adult who ticked everything and typed their name", () => {
    const result = parseWaiverSignature(
      form({ clause: ALL_CLAUSES, signatureText: "tyler le", agree: "on" }),
      ADULT,
      3,
      NOW,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        signedByName: "Tyler Le",
        signerRelation: "SELF",
        signatureText: "tyler le",
        signatureImage: null,
      },
    });
  });

  it("refuses when a rule isn't ticked", () => {
    const result = parseWaiverSignature(
      form({ clause: ["0", "2"], signatureText: "Tyler Le", agree: "on" }),
      ADULT,
      3,
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.clauses).toBeDefined();
  });

  it("refuses an empty or different typed name", () => {
    for (const signatureText of ["", "Someone Else"]) {
      const result = parseWaiverSignature(
        form({ clause: ALL_CLAUSES, signatureText, agree: "on" }),
        ADULT,
        3,
        NOW,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.signatureText).toBeDefined();
    }
  });

  it("refuses without the electronic signature agreement", () => {
    const result = parseWaiverSignature(
      form({ clause: ALL_CLAUSES, signatureText: "Tyler Le" }),
      ADULT,
      3,
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.agree).toBeDefined();
  });

  it("needs a parent or guardian for a minor", () => {
    const result = parseWaiverSignature(
      form({ clause: ALL_CLAUSES, signatureText: "Nevin Gill", agree: "on" }),
      CHILD,
      3,
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.guardianName).toBeDefined();
      expect(result.errors.signerRelation).toBeDefined();
    }
  });

  it("accepts a parent signing for a minor", () => {
    const result = parseWaiverSignature(
      form({
        clause: ALL_CLAUSES,
        guardianName: "Ekam Gill",
        signerRelation: "PARENT",
        signatureText: "Ekam Gill",
        agree: "on",
      }),
      CHILD,
      3,
      NOW,
    );
    expect(result).toMatchObject({
      ok: true,
      value: { signedByName: "Ekam Gill", signerRelation: "PARENT" },
    });
  });

  it("refuses a drawn signature that isn't a PNG", () => {
    const result = parseWaiverSignature(
      form({
        clause: ALL_CLAUSES,
        signatureText: "Tyler Le",
        agree: "on",
        signatureImage: "data:text/html;base64,PHNjcmlwdD4=",
      }),
      ADULT,
      3,
      NOW,
    );
    expect(result.ok).toBe(false);
  });

  it("keeps a valid drawn signature", () => {
    const signatureImage = "data:image/png;base64,iVBORw0KGgo=";
    const result = parseWaiverSignature(
      form({ clause: ALL_CLAUSES, signatureText: "Tyler Le", agree: "on", signatureImage }),
      ADULT,
      3,
      NOW,
    );
    expect(result).toMatchObject({ ok: true, value: { signatureImage } });
  });
});
