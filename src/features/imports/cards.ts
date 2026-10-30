import type { Issue, RawTable } from "./types";

// Full card numbers must never come in through an import. One is enough to
// refuse the whole file, and the number itself is never shown back.

// Luhn checksum: from the right, double every second digit (minus 9 when it
// goes over 9); the total of all digits must end in 0.
function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

// 13 to 19 digits once spaces and dashes are removed, with a valid checksum.
export function isCardNumber(value: string): boolean {
  const digits = value.replace(/[\s-]/g, "");
  return /^\d{13,19}$/.test(digits) && passesLuhn(digits);
}

// The first column with any card number in it, or null.
export function findCardNumberColumn(table: RawTable): string | null {
  return (
    table.headers.find((header) => table.rows.some((row) => isCardNumber(row[header] ?? ""))) ??
    null
  );
}

// The refusal for a file with card numbers. Names the column, never the number.
export function cardNumberIssue(fileName: string, column: string): Issue {
  return {
    file: fileName,
    row: null,
    field: column,
    status: "cantImport",
    message: `This file has full card numbers in the ${column} column. Don't send card numbers in a spreadsheet. Delete the column and send it again.`,
  };
}
