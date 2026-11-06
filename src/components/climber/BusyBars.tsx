import Box from "@mui/material/Box";

export type BusyBar = {
  /** Typical climbers that hour; null when the gym is closed then (no bar). */
  value: number | null;
  /** Shade 0 (quiet) to 4 (busy). */
  level: number;
  now?: boolean;
};

type Props = {
  bars: BusyBar[];
  /** The value a full-height bar stands for. */
  max: number;
  /** Bar area height in px: 72 for today's chart, 32 for a day's strip. */
  height?: number;
  /** What a screen reader hears instead of every bar: "Usually busiest around 6 PM". */
  label: string;
};

// How busy the gym usually is, hour by hour, as bars shaded quiet to busy. The current hour
// is drawn in the text color so it stands out without relying on hue.
export default function BusyBars({ bars, max, height = 72, label }: Props) {
  return (
    <Box
      role="img"
      aria-label={label}
      sx={{
        height,
        display: "grid",
        gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))`,
        gap: "3px",
        alignItems: "end",
      }}
    >
      {bars.map((bar, i) => (
        <Box
          key={i}
          sx={{
            height: bar.value === null ? 0 : Math.max(4, Math.round((bar.value / max) * height)),
            borderRadius: 1,
            bgcolor: bar.value === null ? "transparent" : bar.now ? "heatNow" : `heat.${bar.level}`,
          }}
        />
      ))}
    </Box>
  );
}
