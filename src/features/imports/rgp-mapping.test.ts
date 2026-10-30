import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "./parse";
import {
  belayLevel,
  mapHeaders,
  rgpPhone,
  RGP_CUSTOMER_COLUMNS,
  RGP_VISIT_COLUMNS,
} from "./rgp-mapping";

// Reads CSV text into a table.
function table(fileName: string, text: string) {
  const result = parseCsv(fileName, text);
  if (!result.ok) throw new Error(result.issue.message);
  return result.table;
}

const fixture = (path: string) =>
  table(path, readFileSync(join(__dirname, "fixtures", path), "utf8"));

describe("mapHeaders on the RGP fixtures", () => {
  it("knows every customers.csv column, and skips only the three we don't import", () => {
    const mapped = mapHeaders(fixture("rgp/customers.csv"), RGP_CUSTOMER_COLUMNS);
    expect(mapped.missing).toEqual([]);
    expect(mapped.notImported).toEqual([
      { column: "EFT_DUES", reason: "billing stays in your current system" },
      { column: "EMERGENCY_CONTACT", reason: "Elevate doesn't store emergency contacts yet" },
      { column: "EMERGENCY_PHONE", reason: "Elevate doesn't store emergency contacts yet" },
    ]);
    expect(Object.keys(mapped.headers)).toHaveLength(23);
  });

  it("knows every visit-counts.csv column", () => {
    const mapped = mapHeaders(fixture("rgp/visit-counts.csv"), RGP_VISIT_COLUMNS);
    expect(mapped).toEqual({
      headers: { Barcode: "Barcode", Visits: "Visits", Customer: "Customer" },
      missing: [],
      notImported: [],
    });
  });
});

describe("mapHeaders", () => {
  it("reports a missing BARCODE column", () => {
    const mapped = mapHeaders(table("f.csv", "FIRST_NAME,LAST_NAME\nAnn,Lee\n"), RGP_CUSTOMER_COLUMNS);
    expect(mapped.missing).toContain("BARCODE");
  });

  it("matches headers ignoring case and spaces", () => {
    const mapped = mapHeaders(table("f.csv", "barcode, First_Name \n1,Ann\n"), RGP_CUSTOMER_COLUMNS);
    expect(mapped.headers.BARCODE).toBe("barcode");
    expect(mapped.headers.FIRST_NAME).toBe("First_Name");
  });

  it("lists columns it doesn't know as not recognised", () => {
    const mapped = mapHeaders(table("f.csv", "BARCODE,SHOE_SIZE\n1,42\n"), RGP_CUSTOMER_COLUMNS);
    expect(mapped.notImported).toEqual([{ column: "SHOE_SIZE", reason: "not recognised" }]);
  });
});

describe("rgpPhone", () => {
  it("stores Thao's identical cell and home phone once", () => {
    const customers = fixture("rgp/customers.csv");
    const thao = customers.rows.find((row) => row.BARCODE === "10001")!;
    expect(rgpPhone(thao.CELL_PHONE, thao.HOME_PHONE)).toEqual({
      value: "+12505550101",
      warning: null,
    });
  });

  it("uses the home phone only when the cell is empty", () => {
    expect(rgpPhone("250-555-0101", "250-555-0199").value).toBe("+12505550101");
    expect(rgpPhone("", "250-555-0199").value).toBe("+12505550199");
    expect(rgpPhone("", "").value).toBeNull();
  });
});

describe("belayLevel", () => {
  it("reads Lead, TR and None", () => {
    expect(belayLevel("Lead")).toEqual({ kind: "cert", certification: "lead" });
    expect(belayLevel("TR")).toEqual({ kind: "cert", certification: "top_rope" });
    expect(belayLevel("None")).toEqual({ kind: "none" });
  });

  it("treats Auto Belay Only as unknown, not auto_belay", () => {
    expect(belayLevel("Auto Belay Only")).toEqual({ kind: "unknown", label: "Auto Belay Only" });
  });

  it("treats an empty cell as no cert", () => {
    expect(belayLevel("")).toEqual({ kind: "none" });
  });
});
