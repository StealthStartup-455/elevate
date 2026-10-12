import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { BUSYNESS_POLL_INTERVAL_MS, getGymBusynessSettings } from "../config";
import { getBusynessSummary } from "../queries";
import AutoRefresh from "./AutoRefresh";
import { LEVEL_COLOR, LEVEL_LABEL } from "./BusynessLevelChip";
import { formatTime } from "./format";

// "How busy is it?" at a glance on a climber's phone (#37).
// Uses the summary query only, so no other climber's data is sent.
export default async function CustomerBusyness({ gymId }: { gymId: string }) {
  const busyness = await getBusynessSummary(gymId);
  const { timeZone } = getGymBusynessSettings(gymId);
  const color = LEVEL_COLOR[busyness.level];

  return (
    <Card variant="outlined" sx={{ width: "100%", maxWidth: 720 }}>
      <AutoRefresh intervalMs={BUSYNESS_POLL_INTERVAL_MS} />
      <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
        <Typography variant="overline" color="text.secondary" component="h2">
          How busy is the gym?
        </Typography>
        {/* Stacked on phones, side by side on wider screens. */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 2, sm: 4 }}
          sx={{ alignItems: "center", mt: 1, textAlign: { xs: "center", sm: "left" } }}
        >
          <Box
            sx={{
              px: 4,
              py: { xs: 1.5, sm: 2 },
              width: { xs: "100%", sm: "auto" },
              minWidth: { sm: 240 },
              borderRadius: 3,
              textAlign: "center",
              bgcolor: `${color}.main`,
              color: `${color}.contrastText`,
            }}
          >
            <Typography
              component="p"
              sx={{ fontWeight: 700, fontSize: { xs: "3rem", sm: "3.75rem" }, lineHeight: 1.2 }}
            >
              {LEVEL_LABEL[busyness.level]}
            </Typography>
          </Box>
          <div>
            <Typography variant="h5" component="p">
              ~{busyness.count} climbers here
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Updated {formatTime(busyness.computedAt, timeZone)}
            </Typography>
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
}
