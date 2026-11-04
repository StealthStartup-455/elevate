// "Nov 1, 2027". Parsed and shown as UTC so the date never shifts by a day.
export function formatDate(isoDate: string, withYear = false): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

/**
 * The date line for a membership: "Renews Nov 30" for a recurring plan,
 * "Runs until Nov 30" for a one-off one (#132), "Ended Sep 17" once it has
 * ended. Null when there's nothing to say: no membership, or a paused one,
 * which has no renewal date while it's paused (#124).
 */
export function membershipDateLine(
  status: "none" | "active" | "paused" | "expired",
  endsOn: string | undefined,
  recurring: boolean | undefined,
  withYear = true,
): string | null {
  if (!endsOn || status === "none" || status === "paused") return null;
  const date = formatDate(endsOn, withYear);
  if (status === "expired") return `Ended ${date}`;
  return recurring ? `Renews ${date}` : `Runs until ${date}`;
}
