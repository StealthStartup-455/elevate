import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "./parse";

const fixture = (path: string) => readFileSync(join(__dirname, "fixtures", path), "utf8");

// Unwraps a parse that should succeed.
function table(fileName: string, text: string) {
  const result = parseCsv(fileName, text);
  if (!result.ok) throw new Error(result.issue.message);
  return result.table;
}

// The refusal message, or "ok" when the file was read.
function refusal(text: string) {
  const result = parseCsv("f.csv", text);
  return result.ok ? "ok" : result.issue.message;
}

const NOT_A_SPREADSHEET = "This doesn't look like a spreadsheet. Save it as CSV and try again.";

describe("parseCsv on the RGP fixtures", () => {
  it("reads customers.csv: 23 headers, 10 rows", () => {
    const t = table("customers.csv", fixture("rgp/customers.csv"));
    expect(t.headers).toHaveLength(23);
    expect(t.rows).toHaveLength(10);
    expect(t.rows[0].BARCODE).toBe("10001");
    expect(t.rows[0].CELL_PHONE).toBe("(250) 555-0101");
  });

  it("reads visit-counts.csv: 3 headers, 8 rows, quoted names stay one cell", () => {
    const t = table("visit-counts.csv", fixture("rgp/visit-counts.csv"));
    expect(t.headers).toEqual(["Customer", "Barcode", "Visits"]);
    expect(t.rows).toHaveLength(8);
    expect(t.rows[0]).toEqual({ Customer: "Nguyen, Thao", Barcode: "10001", Visits: "212" });
  });

  it("refuses not-a-csv.csv", () => {
    const result = parseCsv("not-a-csv.csv", fixture("rejected/not-a-csv.csv"));
    expect(result).toEqual({
      ok: false,
      issue: {
        file: "not-a-csv.csv",
        row: null,
        field: null,
        status: "cantImport",
        message: NOT_A_SPREADSHEET,
      },
    });
  });
});

describe("parseCsv", () => {
  it("removes Excel's BOM so the first header is clean", () => {
    const t = table("f.csv", "﻿BARCODE,NAME\n1,Ann\n");
    expect(t.headers).toEqual(["BARCODE", "NAME"]);
  });

  it("trims headers but keeps cell text as is", () => {
    const t = table("f.csv", " BARCODE , NAME \n1, Ann \n");
    expect(t.headers).toEqual(["BARCODE", "NAME"]);
    expect(t.rows[0].NAME).toBe(" Ann ");
  });

  it("skips rows where every cell is empty", () => {
    const t = table("f.csv", "A,B\n1,2\n\n,\n , \n3,4\n");
    expect(t.rows).toEqual([
      { A: "1", B: "2" },
      { A: "3", B: "4" },
    ]);
  });

  it("refuses two columns with the same name", () => {
    const result = parseCsv("f.csv", "EMAIL,NAME, EMAIL\na,b,c\n");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issue.message).toBe("Two columns are both called EMAIL.");
      expect(result.issue.field).toBe("EMAIL");
    }
  });

  it("keeps a newline, a comma and an escaped quote inside quotes in one cell", () => {
    const t = table("f.csv", 'A,B\n"line one\nline two","say ""hi"", ok"\n');
    expect(t.rows).toEqual([{ A: "line one\nline two", B: 'say "hi", ok' }]);
  });

  it("gives a short row empty cells", () => {
    const t = table("f.csv", "A,B,C\n1,2\n");
    expect(t.rows[0]).toEqual({ A: "1", B: "2", C: "" });
  });

  it("refuses one column", () => {
    expect(refusal("A\n1\n2\n")).toBe(NOT_A_SPREADSHEET);
  });

  it("refuses headers with no data rows", () => {
    expect(refusal("A,B\n\n")).toBe(NOT_A_SPREADSHEET);
  });

  it("refuses an empty file", () => {
    expect(refusal("")).toBe(NOT_A_SPREADSHEET);
  });

  it("allows 20,000 rows and refuses 20,001", () => {
    const csv = (n: number) => "A,B\n" + "1,2\n".repeat(n);
    expect(refusal(csv(20_000))).toBe("ok");
    expect(refusal(csv(20_001))).toBe(
      "This file has more than 20,000 rows. Split it and check each part.",
    );
  });
});
