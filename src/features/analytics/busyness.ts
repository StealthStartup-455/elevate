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
