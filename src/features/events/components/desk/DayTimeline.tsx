"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import { layoutDay, timelineHours, type DeskCalendarItem, type DeskCalendarKind } from "../../desk-calendar";
import { formatClock } from "../../time";

// The chosen day as a timeline, like a calendar app (#249): an hour per row, each class, event
// and set change a block from when it starts to when it ends, overlapping ones side by side.
// Something on the whole day sits above the hours. A block jumps to its details below.

/** Height of an hour, in px. */
const HOUR = 48;
/** Width of the hour labels, in px. */
const GUTTER = 56;

// Kinds go by letter, like the month grid. Blocks are links, so they use the navigation color
// (green, amber and red only describe state; STYLE_GUIDE.md). Canceled ones are grey and struck out.
const LETTER: Record<DeskCalendarKind, string> = { class: "C", event: "E", setChange: "S" };

export const itemAnchor = (item: Pick<DeskCalendarItem, "kind" | "id">) => `item-${item.kind}-${item.id}`;

type Props = {
  items: DeskCalendarItem[];
  open: { opensAt: number; closesAt: number } | null;
  /** Today, when the chosen day is today: a line marks the time now. */
  nowMinutes: number | null;
};

export default function DayTimeline({ items, open, nowMinutes }: Props) {
  const allDay = items.filter((i) => i.allDay);
  const timed = items.filter((i) => !i.allDay);
  const { startHour, endHour } = timelineHours(open, timed);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const top = (minutes: number) => ((minutes - startHour * 60) / 60) * HOUR;

  return (
    <div className="flex flex-col gap-2" data-testid="desk-calendar-timeline">
      {allDay.length > 0 ? (
        <div className="flex flex-col gap-1">
          <Typography variant="label">All day</Typography>
          {allDay.map((item) => (
            <Block key={itemAnchor(item)} item={item} />
          ))}
        </div>
      ) : null}

      <Box sx={{ position: "relative", height: hours.length * HOUR }}>
        {/* Hour lines, closed hours shaded and the time now: for the eye only. */}
        <div aria-hidden="true">
          {open ? (
            <>
              <Shade from={top(startHour * 60)} to={top(open.opensAt)} />
              <Shade from={top(open.closesAt)} to={top(endHour * 60)} />
            </>
          ) : null}
          {hours.map((h, i) => (
            <Box
              key={h}
              sx={{ position: "absolute", top: i * HOUR, left: 0, right: 0, borderTop: 1, borderColor: "divider" }}
            >
              <Typography variant="secondary" component="span" sx={{ display: "block", width: GUTTER, pl: 1, pt: 0.5 }}>
                {formatClock(h * 60)}
              </Typography>
            </Box>
          ))}
          {nowMinutes !== null && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60 ? (
            <Box
              sx={{
                position: "absolute",
                top: top(nowMinutes),
                left: GUTTER,
                right: 0,
                borderTop: 2,
                borderColor: "error.main",
                zIndex: 2,
              }}
            />
          ) : null}
        </div>
        {/* Each block links to its details below. */}
        {layoutDay(timed).map(({ item, column, columns }) => {
          const height = Math.max(top(Math.max(item.to, item.from + 30)) - top(item.from), 24);
          return (
            <Box
              key={itemAnchor(item)}
              sx={{
                position: "absolute",
                top: top(item.from),
                height,
                left: `calc(${GUTTER}px + (100% - ${GUTTER}px) * ${column / columns})`,
                width: `calc((100% - ${GUTTER}px) / ${columns} - 4px)`,
                zIndex: 1,
              }}
            >
              <Block item={item} fill />
            </Box>
          );
        })}
      </Box>
    </div>
  );
}

function Shade({ from, to }: { from: number; to: number }) {
  if (to <= from) return null;
  return <Box sx={{ position: "absolute", top: from, height: to - from, left: GUTTER, right: 0, bgcolor: "background.subtle" }} />;
}

function Block({ item, fill = false }: { item: DeskCalendarItem; fill?: boolean }) {
  const letter = LETTER[item.kind];
  const who = item.staff?.length ? item.staff.join(", ") : item.classInfo?.instructor;
  return (
    <ButtonBase
      component="a"
      href={`#${itemAnchor(item)}`}
      className="flex w-full flex-col items-start justify-start overflow-hidden px-2 py-1"
      sx={{
        height: fill ? "100%" : undefined,
        textAlign: "left",
        borderRadius: 1,
        borderLeft: 4,
        borderColor: item.canceled ? "divider" : "secondary.main",
        bgcolor: item.canceled ? "background.subtle" : "secondary.soft",
        "&:hover": { bgcolor: item.canceled ? "background.subtle" : "secondary.softHover" },
      }}
    >
      <Typography
        variant="body"
        component="span"
        noWrap
        sx={{ fontWeight: 600, maxWidth: "100%", textDecoration: item.canceled ? "line-through" : undefined }}
      >
        <span aria-hidden="true">{letter} · </span>
        {item.title}
        {item.canceled ? <span className="sr-only"> (canceled)</span> : null}
      </Typography>
      <Typography variant="secondary" component="span" noWrap sx={{ maxWidth: "100%" }}>
        {item.time}
        {who ? ` · ${who}` : ""}
      </Typography>
    </ButtonBase>
  );
}
