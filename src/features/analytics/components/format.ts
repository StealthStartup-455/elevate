// Formatted on the server in the gym's time zone, so the server's own zone
// (UTC on Vercel) never leaks into the UI.
export function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

// "Oct 9, 6:29 p.m." for lists where check-ins can be from different days.
export function formatDateTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}
