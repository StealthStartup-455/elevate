import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { heatLevel } from "../busyness";
import { getGymBusynessSettings } from "../config";
import { getWeeklyBusyness } from "../queries";

// Fill for heat levels 0 (quiet) to 4 (busy): quiet is the plain cell, then
// four steps of the chart blue (data, not an action).
const SHADES = ["background.subtle", "chart.heat1", "chart.heat2", "chart.heat3", "chart.heat4"];

// The current hour: a ring with a gap, so it shows on light and dark cells.
const NOW_RING = { outline: "2px solid", outlineColor: "text.primary", outlineOffset: "1px" } as const;

// 18 -> "6p", 12 -> "12p", 6 -> "6a"
function shortHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? "a" : "p"}`;
}

function Swatch({ shade, now = false }: { shade: string; now?: boolean }) {
  return <Box sx={{ width: 16, height: 16, borderRadius: 0.5, bgcolor: shade, ...(now ? NOW_RING : {}) }} />;
}

type Props = {
  gymId: string;
  // "today" shows one row, for a quick read on a phone.
  view?: "week" | "today";
  legend?: boolean;
};

// Typical busyness by weekday and hour, with the current hour outlined.
export default async function BusynessHeatMap({ gymId, view = "week", legend = true }: Props) {
  const week = await getWeeklyBusyness(gymId);
  const rows = week.days
    .map((day, d) => ({ day, d }))
    .filter(({ d }) => view === "week" || d === week.now.day);
  const { thresholds } = getGymBusynessSettings(gymId);
  const hours = Array.from(
    { length: week.endHour - week.startHour },
    (_, i) => week.startHour + i,
  );

  return (
    <Box>
      <Box
        role="group"
        aria-label={view === "week" ? "Typical busyness by day and hour" : "Typical busyness today by hour"}
        sx={{
          display: "grid",
          gridTemplateColumns: `${view === "week" ? "2.5rem" : "3rem"} repeat(${hours.length}, minmax(0, 1fr))`,
          gap: 0.5,
          alignItems: "center",
        }}
      >
        <span />
        {hours.map((hour) => (
          <Typography
            key={hour}
            variant="secondary"
            color={hour === week.now.hour ? "text.primary" : "text.secondary"}
            sx={{ fontWeight: hour === week.now.hour ? 600 : 400, whiteSpace: "nowrap", overflow: "visible" }}
          >
            {hour % 3 === 0 ? shortHour(hour) : ""}
          </Typography>
        ))}

        {rows.map(({ day, d }) => (
          <Box key={day} sx={{ display: "contents" }}>
            <Typography
              variant="body"
              color={d === week.now.day ? "text.primary" : "text.secondary"}
              sx={{ fontWeight: d === week.now.day ? 600 : 400 }}
            >
              {view === "today" ? "Today" : day}
            </Typography>
            {hours.map((hour, h) => {
              const value = week.values[d][h];
              const isNow = d === week.now.day && hour === week.now.hour;
              return (
                <Box
                  key={hour}
                  role="img"
                  aria-label={`${day} ${shortHour(hour)}: about ${value} climbers${isNow ? " (now)" : ""}`}
                  title={`${day} ${shortHour(hour)}: ~${value} climbers${isNow ? " (now)" : ""}`}
                  sx={{
                    height: { xs: 20, sm: 24 },
                    borderRadius: 0.5,
                    bgcolor: SHADES[heatLevel(value, thresholds)],
                    ...(isNow ? NOW_RING : {}),
                  }}
                />
              );
            })}
          </Box>
        ))}
      </Box>

      {legend && (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          mt: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="secondary">Quiet</Typography>
          {SHADES.map((shade) => (
            <Swatch key={shade} shade={shade} />
          ))}
          <Typography variant="secondary">Busy</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Swatch shade="background.subtle" now />
          <Typography variant="secondary">Now</Typography>
        </Box>
      </Box>
      )}

      {week.sample && (
        // Stopgap until #39: the week is generated, not this gym's history (#64).
        <Typography variant="secondary" sx={{ mt: 2 }} data-testid="sample-week">
          Demo data: a sample week, not this gym&apos;s history.
        </Typography>
      )}
    </Box>
  );
}
