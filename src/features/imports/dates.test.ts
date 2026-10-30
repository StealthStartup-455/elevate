import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectDateOrder, isBirthDateReasonable, parseDate } from "./dates";
import { parseCsv } from "./parse";

const result = parseCsv(
  "customers.csv",
  readFileSync(join(__dirname, "fixtures", "rgp/customers.csv"), "utf8"),
);
if (!result.ok) throw new Error(result.issue.message);
const customers = result.table.rows;

// The cells of one column of customers.csv.
const column = (name: string) => customers.map((row) => row[name]);
const byBarcode = (barcode: string) => customers.find((row) => row.BARCODE === barcode)!;

describe("detectDateOrder", () => {
  it("can't tell the order of customers.csv's BIRTHDAY column", () => {
    expect(detectDateOrder(column("BIRTHDAY"))).toBe("unknown");
  });

  it("is ymd when every filled value is YYYY-MM-DD", () => {
    expect(detectDateOrder(["2026-01-01", "", "1999-12-31"])).toBe("ymd");
  });

  it("is dmy when a first part is over 12", () => {
    expect(detectDateOrder(["03/04/1996", "28/09/2001"])).toBe("dmy");
  });

  it("is mdy when a second part is over 12", () => {
    expect(detectDateOrder(["03/04/1996", "09/28/2001"])).toBe("mdy");
  });

  it("is unknown when both or neither are over 12", () => {
    expect(detectDateOrder(["28/09/2001", "09/28/2001"])).toBe("unknown");
    expect(detectDateOrder(["03/04/1996", "05/06/2001"])).toBe("unknown");
  });

  it("doesn't let YYYY-MM-DD values settle the slashed ones", () => {
    expect(detectDateOrder(["1996-04-03", "03/04/1996"])).toBe("unknown");
  });

  it("is unknown for an empty column", () => {
    expect(detectDateOrder(["", " "])).toBe("unknown");
  });
});

describe("parseDate", () => {
  it("reads the Kowalski birthdays in customers.csv", () => {
    const order = detectDateOrder(column("BIRTHDAY"));
    expect(parseDate(byBarcode("10004").BIRTHDAY, order)).toEqual({ ok: false, reason: "ambiguous" });
    expect(parseDate(byBarcode("10005").BIRTHDAY, order)).toEqual({ ok: true, date: "1996-04-03" });
  });

  it("reads 03/04/1996 the way the gym says", () => {
    expect(parseDate("03/04/1996", "mdy")).toEqual({ ok: true, date: "1996-03-04" });
    expect(parseDate("03/04/1996", "dmy")).toEqual({ ok: true, date: "1996-04-03" });
  });

  it("reads a slashed date with only one possible answer, even with no order", () => {
    expect(parseDate("28/09/2001", "unknown")).toEqual({ ok: true, date: "2001-09-28" });
    expect(parseDate("09/28/2001", "unknown")).toEqual({ ok: true, date: "2001-09-28" });
    expect(parseDate("05/05/2001", "unknown")).toEqual({ ok: true, date: "2001-05-05" });
    expect(parseDate("05/06/2001", "unknown")).toEqual({ ok: false, reason: "ambiguous" });
  });

  it("knows leap years", () => {
    expect(parseDate("2024-02-29", "ymd")).toEqual({ ok: true, date: "2024-02-29" });
    expect(parseDate("2023-02-29", "ymd")).toEqual({ ok: false, reason: "impossible" });
  });

  it("refuses dates that don't exist", () => {
    expect(parseDate("1999-13-01", "ymd")).toEqual({ ok: false, reason: "impossible" });
    expect(parseDate("2024-02-31", "ymd")).toEqual({ ok: false, reason: "impossible" });
    // Day 28, month 09 read as month 28: no such month.
    expect(parseDate("28/09/2001", "mdy")).toEqual({ ok: false, reason: "impossible" });
  });

  it("says why it couldn't read a value", () => {
    expect(parseDate("", "ymd")).toEqual({ ok: false, reason: "empty" });
    expect(parseDate("  ", "ymd")).toEqual({ ok: false, reason: "empty" });
    expect(parseDate("April 3", "ymd")).toEqual({ ok: false, reason: "unreadable" });
    // Two-digit years would mean guessing the century.
    expect(parseDate("03/04/96", "mdy")).toEqual({ ok: false, reason: "unreadable" });
  });

  it.each(["PREPAID_START", "PREPAID_END", "WAIVER_DATE", "FIRST_VISIT", "LAST_VISIT"])(
    "reads every %s value in customers.csv",
    (name) => {
      const order = detectDateOrder(column(name));
      for (const value of column(name).filter((v) => v.trim() !== "")) {
        expect(parseDate(value, order), value).toMatchObject({ ok: true });
      }
    },
  );
});

describe("isBirthDateReasonable", () => {
  const now = new Date("2026-10-30T12:00:00Z");

  it("allows 1900-01-01 up to today", () => {
    expect(isBirthDateReasonable("1900-01-01", now)).toBe(true);
    expect(isBirthDateReasonable("1996-04-03", now)).toBe(true);
    expect(isBirthDateReasonable("2026-10-30", now)).toBe(true);
  });

  it("refuses before 1900 or in the future", () => {
    expect(isBirthDateReasonable("1899-12-31", now)).toBe(false);
    expect(isBirthDateReasonable("2026-10-31", now)).toBe(false);
  });
});
