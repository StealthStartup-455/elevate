import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// "9 a.m.", "12 p.m." for an hour of the gym's clock.
function hourLabel(hour: number): string {
  return new Intl.DateTimeFormat("en-CA", { hour: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, 0, 1, hour)),
  );
}

// "6a", "10p" under the bars.
function shortHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 || hour === 24 ? "a" : "p"}`;
}

const plural = (n: number) => `${n} check-in${n === 1 ? "" : "s"}`;

// The hours a gym is usually open, like the heat map's. A check-in outside
// them widens the row, so none is ever hidden.
const OPEN = 6;
const CLOSE = 22;

/**
 * The day's check-ins per hour as a row of small bars on a baseline (one
 * series, so no legend). Blue bars, the current hour darker, per the style
 * guide's chart rules. Screen readers get the busy hours as text.
 */
export default function HourlyBars({ hourly, currentHour }: { hourly: number[]; currentHour: number | null }) {
  const used = hourly.flatMap((n, h) => (n > 0 ? [h] : []));
  const from = Math.min(OPEN, ...used);
  const to = Math.max(CLOSE, ...used.map((h) => h + 1));
  const hours = Array.from({ length: to - from }, (_, i) => from + i);
  const max = Math.max(1, ...hourly);
  const busy = used.map((h) => `${hourLabel(h)}: ${hourly[h]}`);
  const summary = busy.length ? `Check-ins by hour. ${busy.join(", ")}` : "No check-ins yet";

  return (
    <Box role="img" aria-label={summary} className="flex flex-col gap-0.5" data-testid="hourly-bars">
      <Box className="flex h-7 items-end gap-0.5" sx={{ borderBottom: 1, borderColor: "divider" }}>
        {hours.map((hour) => {
          const n = hourly[hour];
          return (
            // Hover text like the heat map's; the container's label is what screen readers get.
            <Box key={hour} title={`${hourLabel(hour)}: ${plural(n)}`} className="flex h-full w-1.5 items-end">
              {n > 0 && (
                <Box
                  className="w-full rounded-t-sm"
                  sx={{
                    height: `${Math.max(15, (n / max) * 100)}%`,
                    bgcolor: hour === currentHour ? "chart.now" : "chart.data",
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
      <div className="flex justify-between" aria-hidden="true">
        <Typography variant="secondary" sx={{ lineHeight: 1 }}>
          {shortHour(from)}
        </Typography>
        <Typography variant="secondary" sx={{ lineHeight: 1 }}>
          {shortHour(to)}
        </Typography>
      </div>
    </Box>
  );
}
