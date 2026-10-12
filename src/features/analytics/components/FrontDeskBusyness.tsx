import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { formatWindow } from "../busyness";
import { BUSYNESS_POLL_INTERVAL_MS, getGymBusynessSettings } from "../config";
import { getFrontDeskBusyness } from "../queries";
import type { WaiverStatus } from "../types";
import AutoRefresh from "./AutoRefresh";
import BusynessLevelChip from "./BusynessLevelChip";
import { formatTime } from "./format";

const WAIVER_COLOR = {
  valid: "success",
  expired: "warning",
  missing: "error",
} as const satisfies Record<WaiverStatus, string>;

// Front desk busyness: headline count, level and who checked in (#38).
export default async function FrontDeskBusyness({ gymId }: { gymId: string }) {
  const busyness = await getFrontDeskBusyness(gymId);
  const { timeZone } = getGymBusynessSettings(gymId);

  return (
    <Card variant="outlined">
      <AutoRefresh intervalMs={BUSYNESS_POLL_INTERVAL_MS} />
      <CardContent>
        <Stack
          direction="row"
          spacing={2}
          useFlexGap
          sx={{ alignItems: "center", flexWrap: "wrap" }}
        >
          <Typography variant="h5" component="h2">
            {busyness.count} check-ins in the last {formatWindow(busyness.windowMinutes)}
          </Typography>
          <BusynessLevelChip level={busyness.level} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Updated {formatTime(busyness.computedAt, timeZone)}
        </Typography>

        <TableContainer sx={{ mt: 2 }}>
          <Table size="small" aria-label="Recent check-ins">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>Checked in</TableCell>
                <TableCell>Waiver</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {busyness.checkIns.map((checkIn) => (
                <TableRow key={checkIn.id}>
                  <TableCell>
                    {checkIn.climber.firstName} {checkIn.climber.lastName}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {formatTime(checkIn.timestamp, timeZone)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={checkIn.climber.waiverStatus}
                      color={WAIVER_COLOR[checkIn.climber.waiverStatus]}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {busyness.checkIns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>No check-ins yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
