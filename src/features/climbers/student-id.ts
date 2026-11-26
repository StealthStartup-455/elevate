// The student ID a climber's barcode holds (#38): "V" and 8 digits, like
// V00946178. Plain module, so the browser, the server and the seed share it.

const STUDENT_ID = /^V\d{8}$/;

/** What was typed or scanned, tidied: no spaces, upper case. Not yet checked. */
export function normalizeStudentId(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

// "" (no V number) is stored as null, so the unique index ignores it (#245).
export function storedStudentId(value: string): string | null {
  return value === "" ? null : value;
}

export function isStudentId(value: string): boolean {
  return STUDENT_ID.test(value);
}

/** A made-up ID for test and seed climbers. */
export function randomStudentId(random: () => number = Math.random): string {
  let digits = "";
  for (let i = 0; i < 8; i++) digits += Math.floor(random() * 10);
  return `V${digits}`;
}
