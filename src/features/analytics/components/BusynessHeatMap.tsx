import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { heatLevel } from "../busyness";
import { getGymBusynessSettings } from "../config";
import { getWeeklyBusyness } from "../queries";
import { SHADES, shortHour } from "./heat";

function Swatch({ shade }: { shade: string }) {
  return <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: shade }} />;
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
          gridTemplateColumns: `${view === "week" ? "2.25rem" : "2.75rem"} repeat(${hours.length}, minmax(0, 1fr))`,
          gap: "3px",
          alignItems: "center",
        }}
      >
        <span />
        {hours.map((hour) => (
          <Typography
            key={hour}
            variant="caption"
            color="text.secondary"
            sx={{ lineHeight: 1.5, whiteSpace: "nowrap", overflow: "visible" }}
          >
            {hour % 3 === 0 ? shortHour(hour) : ""}
          </Typography>
        ))}

        {rows.map(({ day, d }) => (
          <Box key={day} sx={{ display: "contents" }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: d === week.now.day ? 700 : 400 }}
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
                  title={`${day} ${shortHour(hour)}: ~${value} climbers`}
                  sx={{
                    aspectRatio: "1",
                    borderRadius: 0.5,
                    bgcolor: SHADES[heatLevel(value, thresholds)],
                    outline: isNow ? "2px solid" : "none",
                    outlineColor: "text.primary",
                    outlineOffset: "-1px",
                  }}
                />
              );
            })}
          </Box>
        ))}
      </Box>

      {week.sample && (
        // Stopgap until #39: the week is generated, not this gym's history (#64).
        <Typography variant="secondary" sx={{ mt: 2 }} data-testid="sample-week">
          Demo data: a sample week, not this gym&apos;s history.
        </Typography>
      )}

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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="caption">Quiet</Typography>
          {SHADES.map((shade) => (
            <Swatch key={shade} shade={shade} />
          ))}
          <Typography variant="caption">Busy</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Outlined = now
        </Typography>
      </Box>
      )}
    </Box>
  );
}
