import { db } from "@/lib/db";
import { logWarning } from "@/lib/log";
import type { ParsedTiming } from "./timing";

export type AttemptRecord = ParsedTiming & {
  gymId: string;
  climberId: string | null;
  outcome: "CHECKED_IN" | "REFUSED" | "GAVE_UP";
};

/**
 * Saves one desk check in attempt for the metrics (#251). Never throws: a
 * metric that fails to save must not turn a check in into an error.
 */
export async function recordCheckInAttempt(attempt: AttemptRecord): Promise<void> {
  try {
    await db.checkInAttempt.create({
      data: {
        gymId: attempt.gymId,
        climberId: attempt.climberId,
        source: attempt.source,
        outcome: attempt.outcome,
        reason: attempt.reason,
        wasBlocked: attempt.wasBlocked,
        elapsedMs: attempt.elapsedMs,
      },
    });
  } catch (error) {
    logWarning("check_in_attempt_not_saved", {
      gymId: attempt.gymId,
      outcome: attempt.outcome,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
