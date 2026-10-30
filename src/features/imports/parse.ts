import Papa from "papaparse";
import type { Issue, RawTable } from "./types";

// Reads a CSV file's text into a table. Pure: the caller reads the file.

export const MAX_ROWS = 20_000;

export type ParseResult = { ok: true; table: RawTable } | { ok: false; issue: Issue };

// A refusal for the whole file.
function refuse(fileName: string, message: string, field: string | null = null): ParseResult {
  return {
    ok: false,
    issue: { file: fileName, row: null, field, status: "cantImport", message },
  };
}

export function parseCsv(fileName: string, text: string): ParseResult {
  // Excel starts UTF-8 CSVs with an invisible byte order mark.
  const clean = text.replace(/^﻿/, "");
  // Always a comma: Papa Parse would otherwise guess the separator.
  const { data } = Papa.parse<string[]>(clean, { delimiter: "," });

  const [headerRow = [], ...dataRows] = data;
  const headers = headerRow.map((h) => h.trim());

  const seen = new Set<string>();
  for (const header of headers) {
    if (seen.has(header)) {
      return refuse(fileName, `Two columns are both called ${header}.`, header);
    }
    seen.add(header);
  }

  const filled = dataRows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
  if (headers.length < 2 || filled.length === 0) {
    return refuse(fileName, "This doesn't look like a spreadsheet. Save it as CSV and try again.");
  }
  if (filled.length > MAX_ROWS) {
    return refuse(fileName, "This file has more than 20,000 rows. Split it and check each part.");
  }

  // A short row gets "" for the cells it's missing.
  const rows = filled.map((cells) =>
    Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? ""])),
  );
  return { ok: true, table: { fileName, headers, rows } };
}
