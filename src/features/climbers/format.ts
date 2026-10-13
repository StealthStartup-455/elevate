// "Nov 1, 2027". Parsed and shown as UTC so the date never shifts by a day.
export function formatDate(isoDate: string, withYear = false): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
