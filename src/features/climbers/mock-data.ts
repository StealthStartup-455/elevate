// In-memory stand-in for the climbers table until the schema exists. Replaced
// by real queries in queries.ts and actions.ts; nothing else imports this file.
// Fixed values (no clock-relative dates) so features built on it are repeatable.
import type { Climber } from "./types";

const SEED: Climber[] = [
  { id: "climber-1", firstName: "Alex", lastName: "Nguyen", phone: "250-555-0101", dateOfBirth: "1994-03-12", waiverStatus: "valid" },
  { id: "climber-2", firstName: "Sam", lastName: "Patel", phone: "250-555-0102", dateOfBirth: "1988-11-02", waiverStatus: "valid" },
  { id: "climber-3", firstName: "Jordan", lastName: "Chen", phone: "250-555-0103", dateOfBirth: "2001-07-25", waiverStatus: "expired" },
  { id: "climber-4", firstName: "Taylor", lastName: "Martin", phone: "250-555-0104", dateOfBirth: "2012-05-18", waiverStatus: "missing" },
  { id: "climber-5", firstName: "Riley", lastName: "Singh", phone: "250-555-0105", dateOfBirth: "1999-01-30", waiverStatus: "valid" },
  { id: "climber-6", firstName: "Casey", lastName: "Brown", phone: "250-555-0106", dateOfBirth: "1976-09-09", waiverStatus: "valid" },
  { id: "climber-7", firstName: "Morgan", lastName: "Wilson", phone: "250-555-0107", dateOfBirth: "2009-12-04", waiverStatus: "valid" },
  { id: "climber-8", firstName: "Jamie", lastName: "Lee", phone: "250-555-0108", dateOfBirth: "1992-06-21", waiverStatus: "expired" },
  { id: "climber-9", firstName: "Avery", lastName: "Tremblay", phone: "250-555-0109", dateOfBirth: "1985-04-15", waiverStatus: "valid" },
  { id: "climber-10", firstName: "Quinn", lastName: "Roy", phone: "250-555-0110", dateOfBirth: "2003-08-08", waiverStatus: "missing" },
  { id: "climber-11", firstName: "Drew", lastName: "Kaur", phone: "250-555-0111", dateOfBirth: "1997-02-27", waiverStatus: "valid" },
  { id: "climber-12", firstName: "Rowan", lastName: "Wong", phone: "250-555-0112", dateOfBirth: "2015-10-14", waiverStatus: "valid" },
];

// Kept on globalThis so dev hot reloads don't wipe edits made in the browser.
const store = globalThis as typeof globalThis & { __climbers?: Climber[] };

export function climberStore(): Climber[] {
  return (store.__climbers ??= SEED.map((c) => ({ ...c })));
}
