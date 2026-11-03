"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";
import BusyBars, { type BusyBar } from "@/components/climber/BusyBars";
import StatusPill from "@/components/ui/StatusPill";
import { SHADES_LEGEND } from "./heat";

export type WeekRow = {
  day: string;
  /** "Today", "Tomorrow", "Wed". */
  label: string;
  /** "Nov 4". */
  date: string;
  /** "6 AM – 10 PM". */
  hours: string;
  closed: boolean;
  special: boolean;
  note: string | null;
  /** One per hour of the axis; null when the gym is closed all day. */
  bars: BusyBar[] | null;
};

type Props = {
  rows: WeekRow[];
  /** The hours every row's bars cover, so they line up. */
  axis: number[];
  /** The typical count a full-height bar stands for. */
  max: number;
  /** True while the typical week is generated, not this gym's history (#64). */
  sampleWeek: boolean;
};

// What a screen reader hears for a day's bars, instead of every bar.
function barsLabel(row: WeekRow, axis: number[]): string {
  const open = (row.bars ?? []).map((b, i) => ({ ...b, hour: axis[i] })).filter((b) => b.value !== null);
  if (open.length === 0) return `${row.label}: closed`;
  const peak = open.reduce((a, b) => ((b.value ?? 0) > (a.value ?? 0) ? b : a));
  const h = peak.hour % 12 === 0 ? 12 : peak.hour % 12;
  return `Usually on ${row.label}: busiest around ${h} ${peak.hour < 12 ? "AM" : "PM"}, about ${peak.value} climbers`;
}

// The week's opening hours, today first, with closed and special days marked. "Show busy
// times" opens bars under each day: its open hours, shaded by how busy they usually are.
export default function WeekHours({ rows, axis, max, sampleWeek }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className="flex flex-col">
      <ul aria-label="Opening hours this week" className="m-0 flex list-none flex-col p-0">
        {rows.map((row, i) => (
          <Box
            component="li"
            key={row.day}
            sx={{ py: 3, borderBottom: 1, borderColor: "divider", "&:first-of-type": { pt: 0 }, "&:last-of-type": { borderBottom: 0 } }}
            className="flex flex-col gap-1"
          >
            <div className="flex min-h-7 items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <Typography variant="body" component="span" sx={{ fontWeight: i === 0 ? 800 : 600 }}>
                  {row.label}
                </Typography>
                <Typography variant="secondary" component="span">
                  {row.date}
                </Typography>
              </div>
              {row.closed ? (
                <StatusPill status="bad" label="Closed" />
              ) : (
                <Typography variant="body" component="span" sx={{ fontWeight: i === 0 ? 800 : 500 }}>
                  {row.hours}
                </Typography>
              )}
            </div>
            {row.special ? <Typography variant="secondary">{row.note ?? "Special hours"}</Typography> : null}
            {row.bars ? (
              <Collapse in={open}>
                <Box sx={{ pt: 2 }}>
                  <BusyBars bars={row.bars} max={max} height={32} label={barsLabel(row, axis)} />
                </Box>
              </Collapse>
            ) : null}
          </Box>
        ))}
      </ul>

      <Collapse in={open} id={id}>
        <div className="flex flex-col gap-2 pt-3">
          <div className="flex items-center gap-1" aria-hidden="true">
            <Typography variant="label" sx={{ color: "text.secondary", mr: 1 }}>
              Quiet
            </Typography>
            {SHADES_LEGEND.map((shade) => (
              <Box key={shade} sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: shade }} />
            ))}
            <Typography variant="label" sx={{ color: "text.secondary", ml: 1 }}>
              Busy
            </Typography>
          </div>
          {sampleWeek ? (
            // Stopgap until #39: the week is generated, not this gym's history (#64).
            <Typography variant="secondary" data-testid="sample-week">
              Demo data: a sample week, not this gym&apos;s history.
            </Typography>
          ) : null}
        </div>
      </Collapse>

      <Button
        variant="outlined"
        fullWidth
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        sx={{ mt: 3 }}
      >
        {open ? "Hide busy times" : "Show busy times"}
      </Button>
    </div>
  );
}
