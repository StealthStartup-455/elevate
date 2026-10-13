import type { BusynessLevel, BusynessThresholds } from "./types";

export function getBusynessLevel(
  count: number,
  thresholds: BusynessThresholds,
): BusynessLevel {
  if (count > thresholds.highAbove) return "high";
  if (count >= thresholds.mediumAt) return "medium";
  return "low";
}

// Start of the active window: check-ins after this are "in the gym".
export function activeWindowStart(now: Date, windowMinutes: number): Date {
  return new Date(now.getTime() - windowMinutes * 60_000);
}

// 120 -> "2 hours", 90 -> "90 minutes"
export function formatWindow(windowMinutes: number): string {
  if (windowMinutes % 60 === 0) {
    const hours = windowMinutes / 60;
    return hours === 1 ? "hour" : `${hours} hours`;
  }
  return `${windowMinutes} minutes`;
}

// How full the bar on the customer card is, 0 to 100. Full at 1.5x the
// "high" threshold (60 climbers with the defaults).
export function busynessPercent(
  count: number,
  thresholds: BusynessThresholds,
): number {
  return Math.min(100, Math.round((count / (thresholds.highAbove * 1.5)) * 100));
}

// Heat map shade, 0 (quiet) to 4 (busy), from a typical climber count.
export function heatLevel(count: number, thresholds: BusynessThresholds): number {
  if (count > thresholds.highAbove) return 4;
  if (count >= (thresholds.mediumAt + thresholds.highAbove) / 2) return 3;
  if (count >= thresholds.mediumAt) return 2;
  if (count >= thresholds.mediumAt / 2) return 1;
  return 0;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Weekday (0 = Monday) and hour of `date` on the gym's wall clock.
export function gymClock(date: Date, timeZone: string): { day: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  return { day: WEEKDAYS.indexOf(weekday), hour };
}
