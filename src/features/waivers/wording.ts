// Checks the waiver editor (#110). Plain functions, like validate.ts, so the
// rules can be unit tested without a database or a browser.
import type { WaiverWording } from "./hash";

export const MAX_TITLE_LENGTH = 120;
export const MAX_BODY_LENGTH = 20_000;
export const MAX_CLAUSES = 20;
export const MAX_CLAUSE_LENGTH = 300;

export type WordingFieldErrors = Partial<Record<"title" | "body" | "clauses" | "confirm", string>>;

export type WordingResult =
  | { ok: true; value: WaiverWording }
  | { ok: false; errors: WordingFieldErrors };

/**
 * The wording from the editor form: a title, the body (blank lines separate
 * paragraphs) and the rules, one per line. Spaces are tidied so the same text
 * always gives the same hash, and the publish box must be ticked.
 */
export function parseWaiverWording(formData: FormData): WordingResult {
  const title = String(formData.get("title") ?? "").replace(/\s+/g, " ").trim();
  const body = String(formData.get("body") ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
  const clauses = String(formData.get("clauses") ?? "")
    .split(/\r?\n/)
    .map((clause) => clause.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const errors: WordingFieldErrors = {};
  if (!title) errors.title = "Give the waiver a title.";
  else if (title.length > MAX_TITLE_LENGTH) errors.title = `Keep the title under ${MAX_TITLE_LENGTH} characters.`;

  if (!body) errors.body = "Write the waiver text.";
  else if (body.length > MAX_BODY_LENGTH) errors.body = `Keep the text under ${MAX_BODY_LENGTH} characters.`;

  if (clauses.length > MAX_CLAUSES) errors.clauses = `Use at most ${MAX_CLAUSES} rules.`;
  else if (clauses.some((clause) => clause.length > MAX_CLAUSE_LENGTH)) {
    errors.clauses = `Keep each rule under ${MAX_CLAUSE_LENGTH} characters.`;
  }

  if (formData.get("confirm") !== "on") {
    errors.confirm = "Tick the box to confirm every climber will sign again.";
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { title, body, clauses } };
}

/** The version after the gym's highest "vN": v1 → v2. Other names are skipped. */
export function nextVersion(existing: string[]): string {
  const numbers = existing.map((v) => /^v(\d+)$/.exec(v)?.[1]).filter(Boolean).map(Number);
  return `v${Math.max(0, ...numbers) + 1}`;
}
