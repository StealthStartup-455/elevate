// Fuzzy text matching for search boxes. Rock Gym Pro only does exact
// matches; staff should find "Jamie Chen" from "jmie", "chen jam" or "jamei".

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Letters of `pattern` appear in order in `text` ("jmch" in "jamie chen").
// Scores higher for matches at word starts and runs of consecutive letters.
function subsequenceScore(text: string, pattern: string): number {
  let score = 0;
  let t = 0;
  let previous = -2;
  for (const ch of pattern) {
    t = text.indexOf(ch, t);
    if (t === -1) return 0;
    score += 1;
    if (t === 0 || text[t - 1] === " ") score += 2;
    if (t === previous + 1) score += 1.5;
    previous = t;
    t += 1;
  }
  return score;
}

// Edit distance of at most 1, counting a swap of two neighbours as one edit.
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) {
    return (
      a.slice(i + 1) === b.slice(i + 1) ||
      (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2))
    );
  }
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/**
 * How well `query` matches `text`: 0 for no match, higher is better.
 * Every word in the query has to match somewhere in the text, in any order.
 * A word matches as a substring, as letters in order, or (for 4+ letters)
 * with one typo against a word in the text.
 */
export function fuzzyScore(text: string, query: string): number {
  const haystack = normalize(text);
  const words = haystack.split(/\s+/);
  let total = 0;

  for (const term of normalize(query).split(/\s+/).filter(Boolean)) {
    let best = 0;
    const at = haystack.indexOf(term);
    if (at !== -1) {
      // Whole substring: best kind of match, more so at a word start.
      best = term.length * 3 + (at === 0 || haystack[at - 1] === " " ? 3 : 0);
    } else {
      best = subsequenceScore(haystack, term);
      if (term.length >= 4) {
        for (const word of words) {
          // A typo in the whole word ("jamei") or in its start ("tremv" for "tremblay").
          if (withinOneEdit(word, term) || withinOneEdit(word.slice(0, term.length), term)) {
            best = Math.max(best, term.length * 2);
          }
        }
      }
    }
    if (best === 0) return 0;
    total += best;
  }
  return total;
}
