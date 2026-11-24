// How the metrics page writes its numbers. Pure.

/** "3.2 s", "45 s", "2 min 5 s"; "None yet" with nothing measured. */
export function formatDuration(ms: number | null): string {
  if (ms === null) return "None yet";
  const seconds = ms / 1000;
  if (seconds < 10) return `${seconds.toFixed(1)} s`;
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds - minutes * 60);
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}

/** "40%"; "None yet" with nothing to divide. */
export function formatShare(value: number | null): string {
  return value === null ? "None yet" : `${Math.round(value * 100)}%`;
}

const REASONS: Record<string, string> = {
  waiver_missing: "No waiver",
  waiver_expired: "Waiver expired",
  membership_none: "No membership or pass",
  membership_expired: "Membership expired",
  membership_paused: "Membership paused",
  already_checked_in: "Already checked in",
  no_punches_left: "No punches left",
  not_found: "Climber not found",
  invalid_id: "Climber not found",
};

/** A reason code in words, for staff. */
export function reasonLabel(code: string): string {
  return REASONS[code] ?? code.replaceAll("_", " ");
}
