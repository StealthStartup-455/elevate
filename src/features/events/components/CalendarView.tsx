"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import ClimberCard from "@/components/climber/ClimberCard";
import StatusPill from "@/components/ui/StatusPill";
import { calendarMonths, formatMonth, monthGrid, monthOf } from "../calendar";
import type { Announcement, ClassItem } from "../queries";
import { formatDay } from "../time";
import ClassList from "./ClassList";

export type ClosedDay = { day: string; note: string | null };

type Props = {
  /** Today on the gym's clock. */
  today: string;
  classes: ClassItem[];
  events: Announcement[];
  /** Days in the coming week the gym is closed all day. */
  closed: ClosedDay[];
};

type Selected = { kind: "class" | "event"; id: string } | null;

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

const DOT = { class: "primary.main", event: "highlight.bg", closed: "error.main" } as const;

// The Calendar view of the Classes tab (#101): a month of days with a dot for each kind of
// thing on them, the chosen day's classes and events underneath, and a bottom sheet with the
// details when one is tapped. A class's sheet signs up or cancels like the Classes list.
export default function CalendarView({ today, classes, events, closed }: Props) {
  // An event that started before today and is still on shows on today.
  const eventDay = (e: Announcement) => (e.day < today ? today : e.day);
  const months = calendarMonths(today, [...classes.map((c) => c.day), ...events.map(eventDay)]);

  const [month, setMonth] = useState(monthOf(today));
  const [day, setDay] = useState(today);
  const [selected, setSelected] = useState<Selected>(null);

  const classesOn = (d: string) => classes.filter((c) => c.day === d);
  const eventsOn = (d: string) => events.filter((e) => eventDay(e) === d);
  const closedOn = (d: string) => closed.find((c) => c.day === d);

  const monthIndex = Math.max(0, months.indexOf(month));
  function pick(d: string) {
    setDay(d);
    setMonth(monthOf(d));
  }

  const dayClasses = classesOn(day);
  const dayEvents = eventsOn(day);
  const dayClosed = closedOn(day);
  const nextDay = [...new Set([...classes.map((c) => c.day), ...events.map(eventDay)])]
    .filter((d) => d > day)
    .sort()[0];

  // Looked up again on every render: signing up refreshes the page's data, and the sheet shows
  // the new places left and "You're in" straight away.
  const sheetClass = selected?.kind === "class" ? classes.find((c) => c.id === selected.id) : undefined;
  const sheetEvent = selected?.kind === "event" ? events.find((e) => e.id === selected.id) : undefined;

  return (
    <div className="flex flex-col gap-3">
      <ClimberCard label="Calendar" testId="calendar">
        <div className="flex items-center justify-between gap-2">
          <IconButton
            aria-label="Previous month"
            disabled={monthIndex === 0}
            onClick={() => setMonth(months[monthIndex - 1])}
          >
            <span aria-hidden="true">‹</span>
          </IconButton>
          <Typography variant="cardTitle" component="h2" aria-live="polite">
            {formatMonth(month)}
          </Typography>
          <IconButton
            aria-label="Next month"
            disabled={monthIndex >= months.length - 1}
            onClick={() => setMonth(months[monthIndex + 1])}
          >
            <span aria-hidden="true">›</span>
          </IconButton>
        </div>

        <div className="grid grid-cols-7 gap-1" aria-hidden="true">
          {WEEKDAY_LETTERS.map((letter, i) => (
            <Typography key={i} variant="label" sx={{ textAlign: "center", color: "text.secondary" }}>
              {letter}
            </Typography>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          {monthGrid(month).map((week, w) => (
            <div key={w} className="grid grid-cols-7 gap-1">
              {week.map((d, i) =>
                d ? (
                  <DayCell
                    key={d}
                    day={d}
                    today={today}
                    selected={d === day}
                    classes={classesOn(d)}
                    events={eventsOn(d)}
                    closed={Boolean(closedOn(d))}
                    onPick={() => pick(d)}
                  />
                ) : (
                  <span key={`empty-${i}`} />
                ),
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1" aria-hidden="true">
          <Legend color={DOT.class} label="Class" />
          <Legend color={DOT.event} label="Event" />
          <Legend color={DOT.closed} label="Closed" />
        </div>
      </ClimberCard>

      <section aria-labelledby="calendar-day" className="flex flex-col gap-3" data-testid="calendar-day">
        <div className="flex items-center gap-2">
          <Typography id="calendar-day" variant="cardTitle" component="h2">
            {formatDay(day)}
          </Typography>
          {day === today ? (
            <Typography variant="label" component="span" sx={{ color: "primary.main" }}>
              Today
            </Typography>
          ) : null}
        </div>

        {dayClosed ? (
          <Box sx={{ bgcolor: "background.paper", borderRadius: 5, p: 4, display: "flex", gap: 3, alignItems: "center" }}>
            <StatusPill status="bad" label="Closed" />
            <Typography variant="secondary">{dayClosed.note ?? "The gym is closed all day."}</Typography>
          </Box>
        ) : null}

        {dayEvents.length + dayClasses.length === 0 ? (
          <Box sx={{ bgcolor: "background.paper", borderRadius: 5, p: 4, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="body">Nothing on this day.</Typography>
            {nextDay ? (
              <Button variant="outlined" onClick={() => pick(nextDay)} sx={{ alignSelf: "flex-start" }}>
                Next up: {formatDay(nextDay)}
              </Button>
            ) : null}
          </Box>
        ) : (
          <ul aria-label={`On ${formatDay(day)}`} className="m-0 flex list-none flex-col gap-2 p-0">
            {dayEvents.map((e) => (
              <AgendaRow
                key={e.id}
                color={DOT.event}
                title={e.title}
                time={e.when.split(" · ").at(-1) ?? e.when}
                canceled={e.canceled}
                pill={e.canceled ? <StatusPill status="bad" label="Canceled" /> : <Tag>Event</Tag>}
                onOpen={() => setSelected({ kind: "event", id: e.id })}
              />
            ))}
            {dayClasses.map((c) => (
              <AgendaRow
                key={c.id}
                color={DOT.class}
                title={c.title}
                time={c.instructor ? `${c.time} · with ${c.instructor}` : c.time}
                canceled={c.canceled}
                pill={
                  c.canceled ? (
                    <StatusPill status="bad" label="Canceled" />
                  ) : c.booked ? (
                    <StatusPill status="ok" label="You're in" />
                  ) : (
                    <Typography
                      variant="label"
                      sx={{ color: c.spotsLeft === 0 ? "error.main" : "text.secondary", whiteSpace: "nowrap" }}
                    >
                      {c.spots}
                    </Typography>
                  )
                }
                onOpen={() => setSelected({ kind: "class", id: c.id })}
              />
            ))}
          </ul>
        )}

        <Typography variant="secondary">Classes show two weeks ahead, events two months.</Typography>
      </section>

      <Drawer
        anchor="bottom"
        open={Boolean(sheetClass ?? sheetEvent)}
        onClose={() => setSelected(null)}
        // Inside the climber theme's box, so the sheet keeps its type and colors.
        disablePortal
        slotProps={{
          paper: {
            sx: {
              bgcolor: "background.default",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "85vh",
              maxWidth: 560,
              mx: "auto",
              p: 4,
              pb: "calc(16px + env(safe-area-inset-bottom))",
              gap: 3,
            },
            role: "dialog",
            "aria-label": sheetClass?.title ?? sheetEvent?.title ?? "Details",
          } as object,
        }}
      >
        <Box aria-hidden="true" sx={{ width: 40, height: 4, borderRadius: 999, bgcolor: "divider", mx: "auto" }} />
        {sheetClass ? <ClassList classes={[sheetClass]} /> : null}
        {sheetEvent ? <EventDetails event={sheetEvent} /> : null}
        <Button variant="outlined" fullWidth onClick={() => setSelected(null)}>
          Close
        </Button>
      </Drawer>
    </div>
  );
}

function DayCell({
  day,
  today,
  selected,
  classes,
  events,
  closed,
  onPick,
}: {
  day: string;
  today: string;
  selected: boolean;
  classes: ClassItem[];
  events: Announcement[];
  closed: boolean;
  onPick: () => void;
}) {
  const past = day < today;
  const parts = [
    classes.length ? `${classes.length} ${classes.length === 1 ? "class" : "classes"}` : null,
    events.length ? `${events.length} ${events.length === 1 ? "event" : "events"}` : null,
    closed ? "closed" : null,
  ].filter(Boolean);
  const dots = [
    classes.length ? DOT.class : null,
    events.length ? DOT.event : null,
    closed ? DOT.closed : null,
  ].filter((c): c is (typeof DOT)[keyof typeof DOT] => c !== null);

  return (
    <ButtonBase
      onClick={onPick}
      aria-pressed={selected}
      aria-current={day === today ? "date" : undefined}
      aria-label={`${formatDay(day)}${parts.length ? `: ${parts.join(", ")}` : ""}`}
      sx={{
        minHeight: 48,
        borderRadius: 3,
        flexDirection: "column",
        gap: 0.5,
        bgcolor: selected ? "primary.main" : "transparent",
        color: selected ? "primary.contrastText" : past ? "text.disabled" : "text.primary",
        outline: day === today && !selected ? "2px solid" : "none",
        outlineColor: "primary.main",
        outlineOffset: -2,
        "&:focus-visible": { outline: "3px solid", outlineColor: "primary.main", outlineOffset: 1 },
      }}
    >
      <Typography variant="body" component="span" sx={{ fontWeight: day === today || selected ? 800 : 600, lineHeight: 1 }}>
        {Number(day.slice(8))}
      </Typography>
      <span className="flex h-1.5 gap-0.5">
        {dots.map((color) => (
          <Box
            key={color}
            component="span"
            sx={{
              width: 6,
              height: 6,
              borderRadius: 999,
              bgcolor: selected ? "primary.contrastText" : color,
            }}
          />
        ))}
      </span>
    </ButtonBase>
  );
}

function AgendaRow({
  color,
  title,
  time,
  canceled,
  pill,
  onOpen,
}: {
  color: string;
  title: string;
  time: string;
  canceled: boolean;
  pill: React.ReactNode;
  onOpen: () => void;
}) {
  return (
    <li>
      <ButtonBase
        onClick={onOpen}
        aria-haspopup="dialog"
        sx={{
          width: "100%",
          textAlign: "left",
          justifyContent: "flex-start",
          bgcolor: "background.paper",
          borderRadius: 5,
          p: 4,
          gap: 3,
          "&:focus-visible": { outline: "3px solid", outlineColor: "primary.main" },
        }}
      >
        <Box aria-hidden="true" sx={{ width: 4, alignSelf: "stretch", borderRadius: 999, bgcolor: color, flexShrink: 0 }} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Typography
            variant="body"
            component="span"
            sx={{ fontWeight: 800, ...(canceled ? { textDecoration: "line-through", color: "text.secondary" } : {}) }}
          >
            {title}
          </Typography>
          <Typography variant="secondary" component="span">
            {time}
          </Typography>
        </div>
        {pill}
      </ButtonBase>
    </li>
  );
}

function EventDetails({ event }: { event: Announcement }) {
  return (
    <Box sx={{ bgcolor: "background.paper", borderRadius: 5, p: 5, display: "flex", flexDirection: "column", gap: 2 }}>
      <div className="flex">{event.canceled ? <StatusPill status="bad" label="Canceled" /> : <Tag>{event.startsIn}</Tag>}</div>
      <Typography
        variant="cardTitle"
        component="h2"
        sx={event.canceled ? { color: "text.secondary", textDecoration: "line-through" } : undefined}
      >
        {event.title}
      </Typography>
      <Typography variant="body" sx={{ color: "text.secondary" }}>
        {event.when}
      </Typography>
      {event.details ? <Typography variant="secondary">{event.details}</Typography> : null}
      {event.canceled ? <Typography variant="secondary">The gym canceled this event.</Typography> : null}
    </Box>
  );
}

// The amber tag announcements use (EventsList, the Home banner).
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <Box
      component="span"
      sx={{ bgcolor: "highlight.bg", color: "highlight.text", typography: "label", px: 2.5, py: 1, borderRadius: 999, whiteSpace: "nowrap" }}
    >
      {children}
    </Box>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <Box component="span" sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: color }} />
      <Typography variant="label" component="span" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
    </span>
  );
}
