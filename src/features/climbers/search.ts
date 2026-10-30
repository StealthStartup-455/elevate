import { fuzzyScore } from "@/lib/fuzzy";

// Climber search, shared by the climber table (in the browser) and manual
// check in (on the server, #85). Plain module, so both sides can import it.

const digits = (s: string) => s.replace(/\D/g, "");

// Match quality, 0 for no match. Number-only words match the phone, the rest
// fuzzy match the name (same rules as the check-in table).
export function searchScore(
  row: { name: string; phone: string },
  query: string,
): number {
  const terms = query.split(/\s+/).filter(Boolean);
  const numbers = terms.filter((t) => /^[\d()+-]+$/.test(t)).map(digits);
  const words = terms.filter((t) => !/^[\d()+-]+$/.test(t));

  const phone = digits(row.phone);
  if (!numbers.every((n) => n === "" || phone.includes(n))) return 0;
  const nameScore = words.length ? fuzzyScore(row.name, words.join(" ")) : 1;
  return nameScore === 0 ? 0 : nameScore + numbers.length * 5;
}

// The best `limit` matches for `query`, best first. Rows that don't match are
// left out.
export function bestMatches<T extends { name: string; phone: string }>(
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
