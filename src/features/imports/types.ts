// Types for the RGP import checker (#40). Nothing here is saved; #41 saves
// the ready records. Dates are ISO calendar dates, YYYY-MM-DD.

// A CSV file as read: original header names and raw cell text. rows[0] is
// data row 1, the first row under the headers.
export type RawTable = {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
};

// How far a person (or one problem) is from being imported.
export type RowStatus = "ready" | "needsReview" | "cantImport";

// One problem or note. Status "ready" is a warning or note that doesn't block.
export type Issue = {
  file: string;
  /** Data row number, from 1. Null when it's about the whole file or a column. */
  row: number | null;
  /** The column it's about, or null for the whole row or file. */
  field: string | null;
  status: RowStatus;
  /** Plain words for a gym owner. */
  message: string;
};

// Something our team asks the gym once (date order, unknown labels, plan names).
export type Question = {
  key: string;
  text: string;
  /** Values from the file that raised it. */
  examples: string[];
};

// A belay certification Elevate understands.
export type Certification = "top_rope" | "lead" | "auto_belay";

// One person from the RGP customers file, cleaned. Null means missing.
export type ImportPerson = {
  /** Their RGP BARCODE. */
  externalId: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  /** Lowercased. */
  email: string | null;
  /** Stored like +12505551234. */
  phone: string | null;
  dateOfBirth: string | null;
  certifications: Certification[];
  /** The parent's BARCODE (RGP's RESPONSIBLE_PARTY_ID). */
  guardianExternalId: string | null;
  /** RGP's CUSTOMER_TYPE, e.g. Member, Punch Card, Guest, Staff. */
  customerType: string | null;
  waiverOnFile: boolean | null;
  waiverSignedAt: string | null;
  /** From the visit count file. Null when they have no row there. */
  visitCount: number | null;
  firstVisitAt: string | null;
  lastVisitAt: string | null;
  /** Data row number in the customers file, from 1. */
  sourceRow: number;
};

// A pass for one person, matching Prisma's PassKind.
export type ImportPass = {
  /** "<barcode>-pass". */
  externalId: string;
  personExternalId: string;
  kind: "DAY" | "PUNCH" | "MEMBERSHIP";
  /** The Elevate plan an RGP membership type maps to, once the gym tells us. */
  planName: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  visitsLeft: number | null;
  /** Frozen in RGP. */
  paused: boolean;
  pausedAt: string | null;
  sourceRow: number;
};

// What the gym owner tells us, so a re-run stops asking.
export type Answers = {
  /** Day/month order per date column, e.g. { BIRTHDAY: "mdy" }. */
  dateOrder?: Record<string, "mdy" | "dmy">;
  /** What an unknown belay label means, e.g. { "Auto Belay Only": "auto_belay" }. */
  labels?: Record<string, Certification | "none">;
  /** Elevate plan name per RGP membership type, e.g. { Billed: "Monthly" }. */
  planNames?: Record<string, string>;
};

// A column we read but don't bring into Elevate, and why.
export type NotImportedColumn = { column: string; reason: string };

// The dry run's result. #41 saves wouldCreate.
export type Report = {
  /** People, with a possible duplicate pair counted as one. */
  totals: { people: number; ready: number; needsReview: number; cantImport: number };
  counts: {
    climbers: number;
    waiversOnFile: number;
    certifications: Record<Certification, number>;
    familyLinks: number;
    visits: number;
  };
  notImported: NotImportedColumn[];
  questions: Question[];
  issues: Issue[];
  /** Only ready people and their passes. */
  wouldCreate: { people: ImportPerson[]; passes: ImportPass[] };
};
