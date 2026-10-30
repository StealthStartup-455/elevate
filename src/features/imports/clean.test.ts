import { describe, expect, it } from "vitest";
import { cleanEmail, cleanName, cleanPhone, cleanYesNo } from "./clean";

describe("cleanPhone", () => {
  it.each(["(250) 555-0101", "250-555-0101", "250 555 0101", "2505550101", "1-250-555-0101"])(
    "stores %s as +12505550101",
    (input) => {
      expect(cleanPhone(input)).toEqual({ value: "+12505550101", warning: null });
    },
  );

  it("cleans each RGP phone style the same way", () => {
    expect(cleanPhone("250-555-0103").value).toBe("+12505550103");
    expect(cleanPhone("250 555 0106").value).toBe("+12505550106");
    expect(cleanPhone("2505550104").value).toBe("+12505550104");
  });

  it("leaves an empty phone empty, with no warning", () => {
    expect(cleanPhone("")).toEqual({ value: null, warning: null });
    expect(cleanPhone("  ")).toEqual({ value: null, warning: null });
  });

  it("leaves out numbers under 10 or over 15 digits, with a warning", () => {
    for (const input of ["555-0101", "12345678901234567"]) {
      const result = cleanPhone(input);
      expect(result.value).toBeNull();
      expect(result.warning).toMatch(/phone number/);
    }
  });
});

describe("cleanEmail", () => {
  it("trims and lowercases", () => {
    expect(cleanEmail(" JAN.K@EXAMPLE.COM ")).toEqual({ value: "jan.k@example.com", warning: null });
  });

  it("leaves an empty email empty, with no warning", () => {
    expect(cleanEmail("")).toEqual({ value: null, warning: null });
  });

  it.each(["jan.k", "jan@example", "jan k@example.com", "@example.com"])(
    "leaves out %s with a warning",
    (input) => {
      const result = cleanEmail(input);
      expect(result.value).toBeNull();
      expect(result.warning).toMatch(/email address/);
    },
  );
});

describe("cleanName", () => {
  it("trims and collapses spaces, keeping capitals", () => {
    expect(cleanName("  Fiona   Rose ")).toBe("Fiona Rose");
    expect(cleanName("McDonald")).toBe("McDonald");
    expect(cleanName("van der Berg")).toBe("van der Berg");
  });

  it("is null when empty", () => {
    expect(cleanName(" ")).toBeNull();
  });
});

describe("cleanYesNo", () => {
  it.each(["Yes", "y", "TRUE", "1"])("%s is true", (input) => {
    expect(cleanYesNo(input)).toBe(true);
  });

  it.each(["No", "n", "false", "0"])("%s is false", (input) => {
    expect(cleanYesNo(input)).toBe(false);
  });

  it("is null when empty and unknown for anything else", () => {
    expect(cleanYesNo("")).toBeNull();
    expect(cleanYesNo("Maybe")).toBe("unknown");
    expect(cleanYesNo("On file")).toBe("unknown");
  });
});
