import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import BusyBars, { type BusyBar } from "@/components/climber/BusyBars";
import ClimberCard from "@/components/climber/ClimberCard";
import StatusPill from "@/components/ui/StatusPill";
import { describeHours, describeStatus, hourRange, isOpenDuring, type DayHours } from "@/features/events/hours";
import { getMyGymWeek, type GymWeek } from "@/features/events/queries";
import { formatClock } from "@/features/events/time";
import { busynessPercent, formatWindow, heatLevel } from "../busyness";
import { CLIMBER_BUSYNESS_REFRESH_MS, getGymBusynessSettings } from "../config";
import { getBusynessSummary, getWeeklyBusyness } from "../queries";
import type { BusynessThresholds, WeeklyBusyness } from "../types";
import AutoRefresh from "./AutoRefresh";
import { shortHour } from "./heat";
import WeekHours, { type WeekRow } from "./WeekHours";

// Home's two busyness cards (#37, #101): "Right now" (open or closed, how busy it is, and how
// today usually goes, hour by hour) and "Hours this week", each day opening into how busy it
// usually is. Counts only, so no other climber's data reaches the phone.
export default async function CustomerBusyness({ gymId }: { gymId: string }) {
  const [busyness, gymWeek, typical] = await Promise.all([
    getBusynessSummary(gymId),
    getMyGymWeek(),
    getWeeklyBusyness(gymId),
  ]);
  const { timeZone, thresholds } = getGymBusynessSettings(gymId);
  // Without hours we can't say it's closed, so the live numbers always show.
  const open = gymWeek ? gymWeek.status.open : true;
  const week = gymWeek ? weekRows(gymWeek, typical, thresholds) : null;
  const today = week?.rows[0];

  return (
    <>
      <ClimberCard label="Right now">
        <AutoRefresh intervalMs={CLIMBER_BUSYNESS_REFRESH_MS} />
        {gymWeek ? (
          <div className="flex flex-wrap items-center justify-between gap-2" data-testid="open-status">
            <StatusPill status={open ? "ok" : "bad"} label={open ? "Open now" : "Closed now"} />
            <Typography variant="body" component="span" sx={{ color: "text.secondary" }}>
              {describeStatus(gymWeek.status)}
            </Typography>
          </div>
        ) : null}

        {/* Closed with nobody checked in: there is nothing to say about now. */}
        {open || busyness.count > 0 ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <Typography variant="kpi">{LEVEL_WORD[busyness.level]}</Typography>
              <Typography variant="body" sx={{ fontWeight: 700 }}>
                ~{busyness.count} climbers here
              </Typography>
            </div>
            <LinearProgress
              variant="determinate"
              value={busynessPercent(busyness.count, thresholds)}
              aria-label="How full the gym is"
            />
          </>
        ) : (
          <Typography variant="body" sx={{ fontWeight: 700 }}>
            ~{busyness.count} climbers here
          </Typography>
        )}
        <div>
          <Typography variant="secondary" title={`Updated ${formatTime(busyness.computedAt, timeZone)}`}>
            Based on check-ins in the last {formatWindow(busyness.windowMinutes)}
          </Typography>
          {busyness.sampleCount > 0 && (
            // Stopgap until #39: say plainly what is generated (#64).
            <Typography variant="secondary" data-testid="sample-check-ins">
              Demo data: includes {busyness.sampleCount} sample check-ins, not real visits.
            </Typography>
          )}
        </div>

        {today?.bars && week ? (
          <Box sx={{ borderTop: 1, borderColor: "divider", pt: 4, display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Typography variant="body" sx={{ fontWeight: 700 }}>
              {peakLine(today.bars, week.axis)}
            </Typography>
            <BusyBars bars={today.bars} max={week.max} label={`Typical busyness today. ${peakLine(today.bars, week.axis)}`} />
            <HourAxis hours={week.axis} />
          </Box>
        ) : null}
      </ClimberCard>

      {week ? (
        <ClimberCard title="Hours this week">
          <WeekHours rows={week.rows} axis={week.axis} max={week.max} sampleWeek={typical.sample} />
        </ClimberCard>
      ) : null}
    </>
  );
}

// "Moderate" reads better than "Medium" as the one big word on the card.
const LEVEL_WORD = { low: "Quiet", medium: "Moderate", high: "Busy" } as const;

function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit", timeZone }).format(date);
}

// "Today usually gets busiest around 6 PM".
function peakLine(bars: BusyBar[], axis: number[]): string {
  let peak = -1;
  bars.forEach((b, i) => {
    if (b.value !== null && (peak === -1 || b.value > (bars[peak].value ?? 0))) peak = i;
  });
  return peak === -1 ? "Closed today" : `Today usually gets busiest around ${formatClock(axis[peak] * 60)}`;
}

function HourAxis({ hours }: { hours: number[] }) {
  return (
    <Box
      aria-hidden="true"
      sx={{ display: "grid", gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))`, gap: "3px", mt: -1 }}
    >
      {hours.map((hour) => (
        <Typography key={hour} variant="label" sx={{ color: "text.secondary", whiteSpace: "nowrap", overflow: "visible" }}>
          {hour % 3 === 0 ? shortHour(hour) : ""}
        </Typography>
      ))}
    </Box>
  );
}

// The week's rows, each with bars for its open hours shaded by how busy that weekday usually
// is. Every row covers the same hours, so the bars line up.
function weekRows(
  gymWeek: GymWeek,
  typical: WeeklyBusyness,
  thresholds: BusynessThresholds,
): { rows: WeekRow[]; axis: number[]; max: number } {
  const range = hourRange(gymWeek.days);
  const axis = range ? Array.from({ length: range.to - range.from }, (_, i) => range.from + i) : [];
  const max = Math.max(1, ...typical.values.flat());
  const barsFor = (day: DayHours, isToday: boolean): BusyBar[] | null =>
    day.hours
      ? axis.map((hour) => {
          if (!isOpenDuring(day.hours, hour)) return { value: null, level: 0 };
          const value = typical.values[day.weekday]?.[hour - typical.startHour] ?? 0;
          return { value, level: heatLevel(value, thresholds), now: isToday && hour === gymWeek.now.hour };
        })
      : null;
  return {
    axis,
    max,
    rows: gymWeek.days.map((day, i) => ({
      day: day.day,
      label: day.label,
      date: day.date,
      hours: describeHours(day.hours),
      closed: !day.hours,
      special: day.special,
      note: day.note,
      bars: barsFor(day, i === 0),
    })),
  };
}
