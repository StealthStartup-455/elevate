import { toStoredPhone } from "@/features/climbers/phone";

// Cleans single values from an import file. A value that can't be used comes
// back as null with a warning in plain words; the row itself stays ready.

export type Cleaned<T> = { value: T | null; warning: string | null };

// "(250) 555-0101" -> "+12505550101", stored like the Climber table.
export function cleanPhone(value: string): Cleaned<string> {
  if (value.trim() === "") return { value: null, warning: null };
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return { value: null, warning: "This phone number doesn't look right, so it was left out." };
  }
  return { value: toStoredPhone(value), warning: null };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Trimmed and lowercased, like the Climber table.
export function cleanEmail(value: string): Cleaned<string> {
  const email = value.trim().toLowerCase();
  if (email === "") return { value: null, warning: null };
  if (!EMAIL.test(email)) {
    return { value: null, warning: "This email address doesn't look right, so it was left out." };
  }
  return { value: email, warning: null };
}

// Trimmed, with runs of spaces made one. Capitals are kept as typed.
export function cleanName(value: string): string | null {
  const name = value.trim().replace(/\s+/g, " ");
  return name === "" ? null : name;
}

// Yes/no cells. Anything we don't recognise is "unknown", never a guess.
export function cleanYesNo(value: string): boolean | null | "unknown" {
  const text = value.trim().toLowerCase();
  if (text === "") return null;
  if (["yes", "y", "true", "1"].includes(text)) return true;
  if (["no", "n", "false", "0"].includes(text)) return false;
  return "unknown";
}
