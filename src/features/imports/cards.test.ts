import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cardNumberIssue, findCardNumberColumn, isCardNumber } from "./cards";
import { parseCsv } from "./parse";

// Reads a fixture file into a table.
function fixture(path: string) {
  const result = parseCsv(path, readFileSync(join(__dirname, "fixtures", path), "utf8"));
  if (!result.ok) throw new Error(result.issue.message);
  return result.table;
}

// Stripe's public test card number.
const TEST_CARD = "4242424242424242";

describe("isCardNumber", () => {
  it("accepts a number that passes the Luhn checksum", () => {
    expect(isCardNumber(TEST_CARD)).toBe(true);
  });

  it("rejects the same number with a wrong last digit", () => {
    expect(isCardNumber("4242424242424241")).toBe(false);
  });

  it("ignores spaces and dashes", () => {
    expect(isCardNumber("4242 4242 4242 4242")).toBe(true);
    expect(isCardNumber("4242-4242-4242-4242")).toBe(true);
  });

  it("is not fooled by phones, barcodes or amounts", () => {
    expect(isCardNumber("2505550101")).toBe(false);
    expect(isCardNumber("(250) 555-0101")).toBe(false);
    expect(isCardNumber("10001")).toBe(false);
    expect(isCardNumber("89.00")).toBe(false);
    expect(isCardNumber("")).toBe(false);
  });

  it("needs 13 to 19 digits", () => {
    // Both pass Luhn, but are too short or too long to be a card.
    expect(isCardNumber("424242424242")).toBe(false);
    expect(isCardNumber("42424242424242424242")).toBe(false);
  });
});

describe("findCardNumberColumn", () => {
  it("catches rejected/card-numbers.csv in the card_number column", () => {
    expect(findCardNumberColumn(fixture("rejected/card-numbers.csv"))).toBe("card_number");
  });

  it("catches nothing in the RGP files", () => {
    expect(findCardNumberColumn(fixture("rgp/customers.csv"))).toBeNull();
    expect(findCardNumberColumn(fixture("rgp/visit-counts.csv"))).toBeNull();
  });

  it("refuses on a single card number among many rows", () => {
    const result = parseCsv("f.csv", `name,note\nAnn,hi\nBo,${TEST_CARD}\nCy,bye\n`);
    if (!result.ok) throw new Error(result.issue.message);
    expect(findCardNumberColumn(result.table)).toBe("note");
  });
});

describe("cardNumberIssue", () => {
  it("refuses the file in plain words, naming the column", () => {
    expect(cardNumberIssue("card-numbers.csv", "card_number")).toEqual({
      file: "card-numbers.csv",
      row: null,
      field: "card_number",
      status: "cantImport",
      message:
        "This file has full card numbers in the card_number column. Don't send card numbers in a spreadsheet. Delete the column and send it again.",
    });
  });

  it("never shows the number back", () => {
    const issue = cardNumberIssue("card-numbers.csv", "card_number");
    expect(JSON.stringify(issue)).not.toContain(TEST_CARD);
  });
});
