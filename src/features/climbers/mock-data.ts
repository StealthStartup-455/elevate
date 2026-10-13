// In-memory stand-in for the climbers table until the schema exists. Replaced
// by real queries in queries.ts and actions.ts; nothing else imports this file.
//
// Seeded from the busyness mock (same ids, names, phones and waiver status), so
// a climber opened from the desk's check-in table is the same person here.
// Dates of birth are made up deterministically from the id, so they never change.
import { mockClimbers } from "@/features/analytics/mock-data";
import type { Climber } from "./types";

function dateOfBirthFor(id: string): string {
  const n = Number(id.replace(/\D/g, "")) || 0;
  // Every 9th climber is a child, so the under-18 case is visible.
  const year = n % 9 === 0 ? 2012 + (n % 4) : 1965 + ((n * 7) % 40);
  const month = ((n * 5) % 12) + 1;
  const day = ((n * 11) % 28) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Kept on globalThis so dev hot reloads don't wipe edits made in the browser.
const store = globalThis as typeof globalThis & { __climbers?: Climber[] };

export function climberStore(): Climber[] {
  return (store.__climbers ??= mockClimbers().map((c) => ({
    ...c,
    dateOfBirth: dateOfBirthFor(c.id),
  })));
}
