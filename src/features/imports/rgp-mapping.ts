import { cleanPhone, type Cleaned } from "./clean";
import type { Certification, ImportPerson, NotImportedColumn, RawTable } from "./types";

// Which Rock Gym Pro column goes to which Elevate field. Column names are
// RGP's "recommended data fields" export (see fixtures/README.md).

// Where a column's value ends up. "pass" columns build the person's pass
// (build.ts); "nameCheck" is only read to double-check a match.
export type Target = keyof ImportPerson | "pass" | "nameCheck";

// One known column: brought in to `target`, or not imported for `reason`.
export type ColumnRule =
  | { column: string; target: Target; note?: string }
  | { column: string; target: null; reason: string };

export const RGP_CUSTOMER_COLUMNS: ColumnRule[] = [
  { column: "BARCODE", target: "externalId" },
  { column: "FIRST_NAME", target: "firstName" },
  { column: "MIDDLE_NAME", target: "middleName" },
  { column: "LAST_NAME", target: "lastName" },
  { column: "BIRTHDAY", target: "dateOfBirth", note: "read with dates.ts" },
  { column: "EMAIL", target: "email" },
  { column: "CELL_PHONE", target: "phone", note: "cell first" },
  { column: "HOME_PHONE", target: "phone", note: "only when the cell is empty" },
  { column: "CUSTOMER_TYPE", target: "customerType", note: "Member, Punch Card, Guest, Staff" },
  { column: "WAIVER_SIGNED", target: "waiverOnFile" },
  { column: "WAIVER_DATE", target: "waiverSignedAt" },
  { column: "BELAY_LEVEL", target: "certifications", note: "see belayLevel" },
  { column: "RESPONSIBLE_PARTY_ID", target: "guardianExternalId", note: "the parent's BARCODE" },
  { column: "MEMBERSHIP_TYPE", target: "pass" },
  { column: "MEMBERSHIP_STATUS", target: "pass" },
  { column: "PREPAID_START", target: "pass" },
  { column: "PREPAID_END", target: "pass" },
  { column: "PUNCHES_REMAINING", target: "pass" },
  { column: "FIRST_VISIT", target: "firstVisitAt" },
  { column: "LAST_VISIT", target: "lastVisitAt" },
  { column: "EFT_DUES", target: null, reason: "billing stays in your current system" },
  {
    column: "EMERGENCY_CONTACT",
    target: null,
    reason: "Elevate doesn't store emergency contacts yet",
  },
  { column: "EMERGENCY_PHONE", target: null, reason: "Elevate doesn't store emergency contacts yet" },
];

// RGP's "Visit Count By Customer" report.
export const RGP_VISIT_COLUMNS: ColumnRule[] = [
  { column: "Barcode", target: "externalId" },
  { column: "Visits", target: "visitCount" },
  { column: "Customer", target: "nameCheck", note: "the name, only to double-check" },
];

export type HeaderMap = {
  /** Our column name -> the header as written in the file. */
  headers: Record<string, string>;
  /** Columns we expect that the file doesn't have. */
  missing: string[];
  /** Columns in the file we don't bring in: known ones with their reason, others "not recognised". */
  notImported: NotImportedColumn[];
};

const key = (name: string) => name.trim().toLowerCase();

// Matches the file's headers to the rules, ignoring case and spaces at the ends.
export function mapHeaders(table: RawTable, rules: ColumnRule[]): HeaderMap {
  const inFile = new Map(table.headers.map((header) => [key(header), header]));
  const headers: Record<string, string> = {};
  const missing: string[] = [];
  const notImported: NotImportedColumn[] = [];

  for (const rule of rules) {
    const header = inFile.get(key(rule.column));
    if (header === undefined) {
      if (rule.target !== null) missing.push(rule.column);
      continue;
    }
    headers[rule.column] = header;
    if (rule.target === null) notImported.push({ column: header, reason: rule.reason });
  }

  const known = new Set(rules.map((rule) => key(rule.column)));
  for (const header of table.headers) {
    if (!known.has(key(header))) notImported.push({ column: header, reason: "not recognised" });
  }
  return { headers, missing, notImported };
}

// One phone from RGP's two: the cell, or the home phone only when the cell is
// empty. Thao's identical cell and home are stored once.
export function rgpPhone(cell: string, home: string): Cleaned<string> {
  return cell.trim() !== "" ? cleanPhone(cell) : cleanPhone(home);
}

export type BelayLevel =
  | { kind: "cert"; certification: Certification }
  | { kind: "none" }
  | { kind: "unknown"; label: string };

const BELAY_LABELS: Record<string, Certification | "none"> = {
  lead: "lead",
  tr: "top_rope",
  none: "none",
};

// RGP's BELAY_LEVEL. Only Lead, TR and None are known; any other label, like
// "Auto Belay Only", is unknown until the gym tells us what it means.
export function belayLevel(value: string): BelayLevel {
  const label = value.trim();
  if (label === "") return { kind: "none" };
  const known = BELAY_LABELS[label.toLowerCase()];
  if (known === undefined) return { kind: "unknown", label };
  return known === "none" ? { kind: "none" } : { kind: "cert", certification: known };
}
