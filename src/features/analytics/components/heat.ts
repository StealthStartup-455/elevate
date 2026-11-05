// Shared by the heat map and the climber's busyness strips.

// Fill for heat levels 0 (quiet) to 4 (busy): quiet is the plain cell, then
// four steps of the chart blue (data, not an action).
export const SHADES = ["background.subtle", "chart.heat1", "chart.heat2", "chart.heat3", "chart.heat4"];

// The climber theme's busy-times shades (climber/tokens.ts heat), quiet to busy, for legends.
export const SHADES_LEGEND = [0, 1, 2, 3, 4].map((i) => `heat.${i}`);

// 18 -> "6p", 12 -> "12p", 6 -> "6a"
export function shortHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour % 24 < 12 ? "a" : "p"}`;
}
