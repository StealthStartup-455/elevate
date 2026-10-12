// Formatted on the server in the gym's time zone, so the server's own zone
// (UTC on Vercel) never leaks into the UI.
export function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}
