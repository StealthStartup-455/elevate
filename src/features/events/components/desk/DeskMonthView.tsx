"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, type KeyboardEvent } from "react";
import StatusPill from "@/components/ui/StatusPill";
import { addMonths, formatMonth, monthGrid, monthOf } from "../../calendar";
import {
  countByKind,
  dayForKey,
  dayInMonth,
  parseDay,
  type DeskCalendarItem,
  type DeskCalendarKind,
  type DeskShift,
  type DeskShiftKind,
} from "../../desk-calendar";
import type { DeskCalendarDay, DeskCalendarMonth } from "../../queries";
import { formatDay, weekdayName, weekdayOf } from "../../time";
import DayTimeline, { itemAnchor } from "./DayTimeline";

// Every kind has its own letter and words, so none depends on color.
const KINDS: Record<DeskCalendarKind, { letter: string; one: string; many: string }> = {
  class: { letter: "C", one: "class", many: "classes" },
  event: { letter: "E", one: "event", many: "events" },
  setChange: { letter: "S", one: "set change", many: "set changes" },
};
const KIND_ORDER: DeskCalendarKind[] = ["class", "event", "setChange"];
const KIND_LABEL: Record<DeskCalendarKind, string> = { class: "Class", event: "Event", setChange: "Set change" };
const SHIFT_LABEL: Record<DeskShiftKind, string> = {
  DESK: "Front desk",
  COACHING: "Coaching",
  CLASS: "Teaching",
  SETTING: "Setting",
  EVENT: "Running an event",
};

const hrefFor = (day: string) => `/desk/events/calendar?day=${day}`;
const cellId = (day: string) => `calendar-${day}`;

// The desk's Calendar tab (#249): a month of what's on, and the chosen day's hours, classes
// (with who signed up), events and set changes beside it. Read only: the other tabs add and
// cancel. The chosen day is in the address, so Back from a climber's account returns to it.
export default function DeskMonthView({ calendar }: { calendar: DeskCalendarMonth }) {
  const { today, nowMinutes, month, days } = calendar;
  const router = useRouter();
  const asked = parseDay(useSearchParams().get("day"), today);
  const day = monthOf(asked) === month ? asked : dayInMonth(month, today);
  const byDay = new Map(days.map((d) => [d.day, d]));
  const chosen = byDay.get(day);

  // A key that moved to another month: focus its day once that month is here.
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    if (focusNext.current === null || monthOf(focusNext.current) !== month) return;
    document.getElementById(cellId(focusNext.current))?.focus();
    focusNext.current = null;
  }, [month]);

  // Within the month there is nothing to load, so only the address changes.
  function pick(next: string) {
    if (next !== day) window.history.replaceState(null, "", hrefFor(next));
  }

  function onKeyDown(event: KeyboardEvent) {
    // Leave the browser's own shortcuts (Alt+Left, Cmd+Left) alone.
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const next = dayForKey(event.key, day, weekdayOf(day));
    if (!next) return;
    event.preventDefault();
    if (monthOf(next) === month) {
      pick(next);
      document.getElementById(cellId(next))?.focus();
    } else {
      focusNext.current = next;
      router.replace(hrefFor(next), { scroll: false });
    }
  }

  return (
    <div className="grid items-start gap-3 xl:grid-cols-2">
      <Card>
        <CardContent className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <IconButton
              component={NextLink}
              href={hrefFor(dayInMonth(addMonths(month, -1), today))}
              scroll={false}
              aria-label="Previous month"
            >
              <span aria-hidden="true">‹</span>
            </IconButton>
            <Typography id="calendar-month" variant="cardTitle" aria-live="polite">
              {formatMonth(month)}
            </Typography>
            <IconButton
              component={NextLink}
              href={hrefFor(dayInMonth(addMonths(month, 1), today))}
              scroll={false}
              aria-label="Next month"
            >
              <span aria-hidden="true">›</span>
            </IconButton>
            <Button
              component={NextLink}
              href={hrefFor(today)}
              scroll={false}
              color="secondary"
              variant="outlined"
              size="small"
              className="ml-auto"
            >
              Today
            </Button>
          </div>

          <div role="grid" aria-labelledby="calendar-month" className="flex flex-col gap-1" onKeyDown={onKeyDown}>
            <div role="row" className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }, (_, i) => (
                <Typography key={i} role="columnheader" variant="label" sx={{ textAlign: "center" }}>
                  {weekdayName(i)}
                </Typography>
              ))}
            </div>
            {monthGrid(month).map((week, w) => (
              <div key={w} role="row" className="grid grid-cols-7 gap-1">
                {week.map((d, i) => {
                  const info = d ? byDay.get(d) : undefined;
                  return (
                    <div key={d ?? `empty-${i}`} role="gridcell" aria-selected={info ? d === day : undefined} className="min-w-0">
                      {info ? (
                        <DayCell info={info} today={today} selected={info.day === day} onPick={() => pick(info.day)} />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {KIND_ORDER.map((kind) => (
              <Legend key={kind} letter={KINDS[kind].letter} label={KIND_LABEL[kind]} />
            ))}
            <Legend letter="H" label="Special hours" />
            <Legend letter="✕" label="Closed" />
          </div>
        </CardContent>
      </Card>

      {chosen ? <DayPanel info={chosen} today={today} nowMinutes={nowMinutes} /> : null}
    </div>
  );
}

function DayCell({
  info,
  today,
  selected,
  onPick,
}: {
  info: DeskCalendarDay;
  today: string;
  selected: boolean;
  onPick: () => void;
}) {
  const { day, closed, special } = info;
  const isToday = day === today;
  const counts = countByKind(info.items);
  const marks = KIND_ORDER.filter((kind) => counts[kind] > 0).map((kind) => ({
    key: kind as string,
    letter: KINDS[kind].letter,
    text: `${counts[kind]} ${counts[kind] === 1 ? KINDS[kind].one : KINDS[kind].many}`,
    bad: false,
  }));
  // A regular closed day (closed every Monday) is marked like a special one.
  if (closed) marks.push({ key: "closed", letter: "✕", text: "Closed", bad: true });
  else if (special) marks.push({ key: "special", letter: "H", text: "Special hours", bad: false });

  return (
    <ButtonBase
      id={cellId(day)}
      onClick={onPick}
      // One tab stop for the grid; the arrow keys move within it.
      tabIndex={selected ? 0 : -1}
      aria-current={isToday ? "date" : undefined}
      className="flex w-full flex-col items-stretch justify-start gap-1 p-1 sm:min-h-20"
      sx={{
        minHeight: 64,
        textAlign: "left",
        border: 1,
        borderRadius: 1,
        borderColor: selected || isToday ? "secondary.main" : "divider",
        bgcolor: selected ? "secondary.soft" : "background.paper",
        "&:hover": { bgcolor: selected ? "secondary.softHover" : "background.subtle" },
      }}
    >
      {/* Read out in full; the short marks below are for the eye. */}
      <span className="sr-only">
        {`${formatDay(day)}${marks.length ? `: ${marks.map((m) => m.text.toLowerCase()).join(", ")}` : ""}`}
      </span>
      <Typography
        variant="body"
        component="span"
        aria-hidden="true"
        sx={{
          fontWeight: isToday || selected ? 600 : 400,
          color: selected || isToday ? "secondary.main" : day < today ? "text.secondary" : "text.primary",
        }}
      >
        {Number(day.slice(8))}
        {isToday ? <span className="hidden sm:inline"> · Today</span> : null}
      </Typography>
      <span className="flex flex-wrap gap-x-2 gap-y-0.5 sm:flex-col" aria-hidden="true">
        {marks.map((m) => (
          <Typography
            key={m.key}
            variant="secondary"
            component="span"
            noWrap
            sx={{ color: m.bad ? "error.main" : "text.secondary" }}
          >
            <Box component="span" sx={{ fontWeight: 600 }}>
              {m.letter}
            </Box>
            <span className="hidden sm:inline"> {m.text}</span>
          </Typography>
        ))}
      </span>
    </ButtonBase>
  );
}

function Legend({ letter, label }: { letter: string; label: string }) {
  return (
    <Typography variant="secondary" component="span">
      <Box component="span" sx={{ fontWeight: 600, color: letter === "✕" ? "error.main" : undefined }}>
        {letter}
      </Box>{" "}
      {label}
    </Typography>
  );
}

function DayPanel({ info, today, nowMinutes }: { info: DeskCalendarDay; today: string; nowMinutes: number }) {
  return (
    <Card component="section" aria-labelledby="calendar-day" data-testid="desk-calendar-day">
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <Typography id="calendar-day" variant="cardTitle">
            {formatDay(info.day)}
          </Typography>
          {info.day === today ? (
            <Typography variant="secondary" component="span">
              Today
            </Typography>
          ) : null}
        </div>

        {info.closed ? (
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status="bad" label="Closed" />
            {info.note ? <Typography variant="secondary">{info.note}</Typography> : null}
          </div>
        ) : (
          <Typography variant="secondary">
            {info.hours ? `${info.special ? "Special hours" : "Open"} ${info.hours}` : "Opening hours aren't set"}
            {info.note ? ` · ${info.note}` : ""}
          </Typography>
        )}

        {info.items.length === 0 ? <Typography variant="body">Nothing scheduled</Typography> : null}
        {info.items.length > 0 || info.open ? (
          <DayTimeline items={info.items} open={info.open} nowMinutes={info.day === today ? nowMinutes : null} />
        ) : null}

        <WhoIsWorking shifts={info.shifts} />

        {info.items.length > 0 ? (
          <>
            <Typography variant="label" component="h3">
              Details
            </Typography>
            <ul aria-label={`On ${formatDay(info.day)}`} className="flex flex-col">
              {info.items.map((item) => (
                <DayItem key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </ul>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

// Who works the chosen day (#249): a table, not a list, so a class's name in it never doubles
// the class in the day's list.
function WhoIsWorking({ shifts }: { shifts: DeskShift[] }) {
  return (
    <div className="flex flex-col gap-1">
      <Typography variant="label" component="h3" id="calendar-staff">
        Who&apos;s working
      </Typography>
      {shifts.length === 0 ? (
        <Typography variant="secondary">No shifts scheduled</Typography>
      ) : (
        <Table size="small" aria-labelledby="calendar-staff" data-testid="desk-calendar-staff">
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Staff</TableCell>
              <TableCell>Shift</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shifts.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Typography variant="body" component="span" noWrap>
                    {s.time}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body" component="span">
                    {s.staffName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    {s.canceled ? (
                      <StatusPill status="bad" label="Canceled" />
                    ) : (
                      <StatusPill status="neutral" label={SHIFT_LABEL[s.kind]} />
                    )}
                    {s.forTitle || s.note ? (
                      <Typography variant="secondary" component="span">
                        {[s.forTitle, s.note].filter(Boolean).join(" · ")}
                      </Typography>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function DayItem({ item }: { item: DeskCalendarItem }) {
  const { classInfo } = item;
  return (
    <li id={itemAnchor(item)} className="flex scroll-mt-4 flex-col gap-1 border-b border-line py-2 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Typography variant="body" sx={{ fontWeight: 600 }}>
          {item.title}
        </Typography>
        {item.canceled ? (
          <StatusPill status="bad" label="Canceled" />
        ) : (
          <StatusPill status="neutral" label={KIND_LABEL[item.kind]} />
        )}
      </div>
      <Typography variant="secondary">
        {item.canceled ? `${KIND_LABEL[item.kind]} · ` : ""}
        {item.time}
        {classInfo?.instructor ? ` · with ${classInfo.instructor}` : ""}
      </Typography>
      {item.staff?.length ? (
        <Typography variant="secondary">Staff on it: {item.staff.join(", ")}</Typography>
      ) : null}
      {item.details ? <Typography variant="secondary">{item.details}</Typography> : null}
      {classInfo ? (
        <>
          <Typography variant="body">
            {classInfo.signedUp.length} of {classInfo.capacity} places taken
          </Typography>
          {classInfo.signedUp.length > 0 ? (
            <ul aria-label={`Signed up for ${item.title}`} className="flex flex-wrap gap-x-3 gap-y-1">
              {classInfo.signedUp.map((s) => (
                <li key={s.climberId}>
                  <Link component={NextLink} href={`/desk/customers/${s.climberId}`}>
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </li>
  );
}
