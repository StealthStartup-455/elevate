import { connection } from "next/server";
import { climberStore } from "./mock-data";
import type { Climber } from "./types";

// Reads for the climbers feature. Swap the bodies for database queries once the
// schema exists; callers don't change.

export async function listClimbers(): Promise<Climber[]> {
  // Render per request, never at build time.
  await connection();
  return [...climberStore()].sort(
    (a, b) =>
      a.lastName.localeCompare(b.lastName) ||
      a.firstName.localeCompare(b.firstName),
  );
}

export async function getClimber(id: string): Promise<Climber | null> {
  await connection();
  return climberStore().find((c) => c.id === id) ?? null;
}
