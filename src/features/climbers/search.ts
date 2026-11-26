import { fuzzyScore } from "@/lib/fuzzy";

// Climber search, shared by the climber table (in the browser) and manual
// check in (on the server, #85). Plain module, so both sides can import it.

const digits = (s: string) => s.replace(/\D/g, "");

// Is `needle` (digits) in `hay` (digits), allowing one wrong digit or two
// neighbouring digits swapped? Only for needles of 5+ digits, so a short
// number can't match everything.
function nearDigits(hay: string, needle: string): boolean {
  if (hay.includes(needle)) return true;
  if (needle.length < 5) return false;
  for (let start = 0; start + needle.length <= hay.length; start++) {
    const wrong: number[] = [];
    for (let i = 0; i < needle.length; i++) if (hay[start + i] !== needle[i]) wrong.push(i);
    if (wrong.length <= 1) return true;
    if (wrong.length === 2 && wrong[1] === wrong[0] + 1) {
      const [i, j] = wrong;
      if (hay[start + i] === needle[j] && hay[start + j] === needle[i]) return true;
    }
  }
  return false;
}

// Match quality, 0 for no match. Number-only words match the phone or the
// V number (student ID, #38), a word like "v0094" matches the V number, and
// the rest fuzzy match the name (same rules as the check-in table).
export function searchScore(
  row: { name: string; phone: string; studentId?: string | null },
  query: string,
): number {
  const terms = query.split(/\s+/).filter(Boolean);
  const idTerms = terms.filter((t) => /^v[\d-]+$/i.test(t)).map(digits);
  const numbers = terms.filter((t) => /^[\d()+-]+$/.test(t)).map(digits);
  const words = terms.filter((t) => !/^[\d()+-]+$/.test(t) && !/^v[\d-]+$/i.test(t));

  const phone = digits(row.phone);
  const student = digits(row.studentId ?? "");
  if (!idTerms.every((n) => n === "" || nearDigits(student, n))) return 0;
  if (!numbers.every((n) => n === "" || phone.includes(n) || nearDigits(student, n))) return 0;
  const nameScore = words.length ? fuzzyScore(row.name, words.join(" ")) : 1;
  if (nameScore === 0) return 0;
  // A number found as typed ranks above one only found with a typo, so a
  // scanned V number puts its climber first, ahead of the near misses, and
  // the result cap can't drop them (#38).
  const exact = [...idTerms, ...numbers].filter(
    (n) => n !== "" && (student.includes(n) || phone.includes(n)),
  ).length;
  return nameScore + (numbers.length + idTerms.length) * 5 + exact * 5;
}

// The best `limit` matches for `query`, best first. Rows that don't match are
// left out.
export function bestMatches<T extends { name: string; phone: string; studentId?: string | null }>(
  rows: T[],
  query: string,
  limit: number,
): T[] {
  if (query.trim() === "") return [];
  return rows
    .map((row) => ({ row, score: searchScore(row, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row }) => row);
}
