// Reads dates from RGP files without guessing. Day/month order is decided
// once per column (detectDateOrder), or given by the gym (Answers.dateOrder),
// never row by row: 03/04/1996 could be March 4 or April 3.

export type DateOrder = "ymd" | "mdy" | "dmy" | "unknown";

export type ParsedDate =
  | { ok: true; date: string }
  | { ok: false; reason: "empty" | "ambiguous" | "impossible" | "unreadable" };

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const SLASHED = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

// The order a column's dates are written in. Only the slashed values decide
// it; YYYY-MM-DD values read the same either way.
export function detectDateOrder(values: string[]): DateOrder {
  const filled = values.map((v) => v.trim()).filter((v) => v !== "");
  if (filled.length === 0) return "unknown";
  if (filled.every((v) => YMD.test(v))) return "ymd";

  let firstOver12 = false;
  let secondOver12 = false;
  for (const value of filled) {
    const match = SLASHED.exec(value);
    if (!match) continue;
    if (Number(match[1]) > 12) firstOver12 = true;
    if (Number(match[2]) > 12) secondOver12 = true;
  }
  if (firstOver12 && !secondOver12) return "dmy";
  if (secondOver12 && !firstOver12) return "mdy";
  return "unknown";
}

// "YYYY-MM-DD" for a real calendar date, or null for one like 2024-02-31.
function realDate(year: number, month: number, day: number): string | null {
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00Z`);
  // Date rolls 2024-02-31 into March, so the round trip catches it.
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return null;
  return iso;
}

// One date, read in the column's order.
export function parseDate(value: string, order: DateOrder): ParsedDate {
  const text = value.trim();
  if (text === "") return { ok: false, reason: "empty" };

  const ymd = YMD.exec(text);
  if (ymd) {
    const date = realDate(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));
    return date ? { ok: true, date } : { ok: false, reason: "impossible" };
  }

  const slashed = SLASHED.exec(text);
  if (!slashed) return { ok: false, reason: "unreadable" };
  const first = Number(slashed[1]);
  const second = Number(slashed[2]);
  const year = Number(slashed[3]);

  let dayFirst: boolean;
  if (order === "dmy") dayFirst = true;
  else if (order === "mdy") dayFirst = false;
  // Order not known: only read it when there's one possible answer.
  else if (first > 12) dayFirst = true;
  else if (second > 12 || first === second) dayFirst = false;
  else return { ok: false, reason: "ambiguous" };

  const date = dayFirst ? realDate(year, second, first) : realDate(year, first, second);
  return date ? { ok: true, date } : { ok: false, reason: "impossible" };
}

// A birthday from 1900-01-01 up to today (UTC).
export function isBirthDateReasonable(date: string, now: Date): boolean {
  return date >= "1900-01-01" && date <= now.toISOString().slice(0, 10);
}
