// Shared by the heat map and the climber's busyness strips.

// Fill for heat levels 0 (quiet) to 4 (busy), as shades of the chart colour (data, not an action).
export const SHADES = [0.08, 0.25, 0.45, 0.7, 1].map(
  (opacity) => `color-mix(in srgb, var(--mui-palette-chart-now) ${opacity * 100}%, transparent)`,
);

// The climber theme's busy-times shades (climber/tokens.ts heat), quiet to busy, for legends.
export const SHADES_LEGEND = [0, 1, 2, 3, 4].map((i) => `heat.${i}`);

// 18 -> "6p", 12 -> "12p", 6 -> "6a"
export function shortHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour % 24 < 12 ? "a" : "p"}`;
}
