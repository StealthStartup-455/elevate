// What a label name may be (#157). Pure, so it's tested without a database.

export const MAX_LABEL_LENGTH = 30;

/** A gym can have this many active labels, so the picker stays usable. */
export const MAX_GYM_LABELS = 50;

export type ParsedLabelName =
  | { ok: true; name: string; key: string }
  | { ok: false; message: string };

// Tabs, line breaks and other invisible control characters.
const CONTROL = /\p{Cc}/u;

/**
 * How two names are compared: "ask for id" and "Ask for ID" are the same
 * label. Stored as GymLabel.key, which is unique in a gym.
 */
export function labelKey(name: string): string {
  return name.toLowerCase();
}

/**
 * A label name as staff typed it, tidied: spaces trimmed from the ends and
 * runs of any kind of space made one plain space. Refuses an empty name, one over MAX_LABEL_LENGTH
 * characters, and control characters.
 */
export function normalizeLabelName(raw: unknown): ParsedLabelName {
  // NFC: an "é" typed as one character or as "e" plus an accent is the same name.
  const trimmed = String(raw ?? "").normalize("NFC").trim();
  if (trimmed === "") return { ok: false, message: "Type a label name." };
  if (CONTROL.test(trimmed)) {
    return { ok: false, message: "A label can't have tabs or line breaks in it." };
  }
  // Any run of spaces, including a pasted non-breaking space, becomes one plain
  // space, so a look-alike name can't slip past the duplicate check. (Tabs and
  // line breaks were refused above.)
  const name = trimmed.replace(/\s+/g, " ");
  // Counted by character, so an emoji is one, not two.
  if ([...name].length > MAX_LABEL_LENGTH) {
    return { ok: false, message: `Keep labels to ${MAX_LABEL_LENGTH} characters or fewer.` };
  }
  return { ok: true, name, key: labelKey(name) };
}
