import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getCheckInClimbers } from "@/features/climbers/queries";
import { formatWindow } from "../busyness";
import { DESK_BUSYNESS_REFRESH_MS, getGymBusynessSettings } from "../config";
import { getFrontDeskBusyness } from "../queries";
import AutoRefresh from "./AutoRefresh";
import BusynessHeatMap from "./BusynessHeatMap";
import BusynessLevelChip from "./BusynessLevelChip";
import CheckInTable, { type CheckInRow } from "./CheckInTable";
import { formatDateTime, formatTime } from "./format";

// Front desk busyness: headline count, level, typical week and who
// checked in (#38). Side by side on wide screens, stacked on narrow ones.
export default async function FrontDeskBusyness({ gymId }: { gymId: string }) {
  const busyness = await getFrontDeskBusyness(gymId);
  const { timeZone } = getGymBusynessSettings(gymId);
  // The mock check-ins point at climbers in the database, so names link to
  // their real page and waivers signed in the app show up here.
  const climbers = await getCheckInClimbers();

  const rows: CheckInRow[] = busyness.checkIns.map((checkIn) => {
    const climber = climbers.get(checkIn.climber.id);
    return {
      id: checkIn.id,
      href: climber ? `/desk/climbers/${climber.id}` : undefined,
      name: `${checkIn.climber.firstName} ${checkIn.climber.lastName}`,
      phone: checkIn.climber.phone,
      checkedInAt: checkIn.timestamp.getTime(),
      timeLabel: formatDateTime(checkIn.timestamp, timeZone),
      waiverStatus: climber?.waiverStatus ?? checkIn.climber.waiverStatus,
    };
  });

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(340px, 420px) minmax(0, 1fr)" },
        gap: 6,
        alignItems: "start",
      }}
    >
      <AutoRefresh intervalMs={DESK_BUSYNESS_REFRESH_MS} />
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack
            direction="row"
            spacing={4}
            useFlexGap
            sx={{ alignItems: "center", flexWrap: "wrap" }}
          >
            <Typography variant="h5" component="h2">
              {busyness.count} check-ins in the last {formatWindow(busyness.windowMinutes)}
            </Typography>
            <BusynessLevelChip level={busyness.level} />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 5 }}>
            Updated {formatTime(busyness.computedAt, timeZone)}
          </Typography>
          <Typography variant="subtitle2" component="h3" sx={{ mb: 2 }}>
            Typical week
          </Typography>
          <BusynessHeatMap gymId={gymId} />
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" component="h2" sx={{ mb: 3 }}>
            Recent check-ins
          </Typography>
          <CheckInTable rows={rows} />
        </CardContent>
      </Card>
    </Box>
  );
}
