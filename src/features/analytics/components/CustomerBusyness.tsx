import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { busynessPercent, formatWindow } from "../busyness";
import { BUSYNESS_POLL_INTERVAL_MS, getGymBusynessSettings } from "../config";
import { getBusynessSummary } from "../queries";
import AutoRefresh from "./AutoRefresh";
import BusynessHeatMap from "./BusynessHeatMap";
import { LEVEL_LABEL } from "./BusynessLevelChip";
import { formatTime } from "./format";
import ShowMore from "./ShowMore";

// "How busy is it?" at a glance on a climber's phone (#37).
// Uses the summary query only, so no other climber's data is sent.
// Layout follows the customer dashboard mock; restyle once the style guide lands.
export default async function CustomerBusyness({ gymId }: { gymId: string }) {
  const busyness = await getBusynessSummary(gymId);
  const { timeZone, thresholds } = getGymBusynessSettings(gymId);

  return (
    <Card variant="outlined" sx={{ width: "100%", maxWidth: 560, borderRadius: 3 }}>
      <AutoRefresh intervalMs={BUSYNESS_POLL_INTERVAL_MS} />
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            How busy is it?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1.5 }}>
          <Typography
            component="p"
            color="primary"
            sx={{ fontWeight: 800, fontSize: { xs: "2.25rem", sm: "2.75rem" }, lineHeight: 1.1 }}
          >
            {LEVEL_LABEL[busyness.level]}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={busynessPercent(busyness.count, thresholds)}
            aria-label="How full the gym is"
            sx={{ flex: 1, height: 10, borderRadius: 5 }}
          />
        </Box>

        <Typography variant="body1" sx={{ mt: 1.5, fontWeight: 600 }}>
          ~{busyness.count} climbers here
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          component="p"
          title={`Updated ${formatTime(busyness.computedAt, timeZone)}`}
          sx={{ mb: 2.5 }}
        >
          Based on check-ins in the last {formatWindow(busyness.windowMinutes)}
        </Typography>

        {/* Today only by default; the full week is one tap away. */}
        <BusynessHeatMap gymId={gymId} view="today" />
        <ShowMore label="Show full week">
          <Box sx={{ pt: 1 }}>
            <BusynessHeatMap gymId={gymId} legend={false} />
          </Box>
        </ShowMore>
      </CardContent>
    </Card>
  );
}
