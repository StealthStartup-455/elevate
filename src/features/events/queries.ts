import { connection } from "next/server";
import { cache } from "react";
import type { Gym } from "@/generated/prisma/client";
import { getSessionClimberId } from "@/features/auth/queries";
import { getStaffContext, requireStaff } from "@/features/auth/staff";
import { getMyGym } from "@/features/purchase/queries";
import { db } from "@/lib/db";
import { getGymById } from "@/lib/gym";
import {
  describeHours,
  openStatus,
  weekAhead,
  type DayHours,
  type OpenStatus,
  type SpecialDay,
} from "./hours";
import {
  ANNOUNCE_DAYS,
  CLASS_DAYS,
  DAY_MS,
  describeMoment,
  describeSpots,
  eventEnd,
  NEW_ROUTES_DAYS,
  SET_CHANGE_AHEAD_DAYS,
  setChangeState,
  spotsLeft,
  startsIn,
  type SetChangeState,
} from "./schedule";
import { addDays, formatClockRange, formatDay, formatSpan, gymClockAt, MINUTES_PER_DAY, weekdayName } from "./time";

// Reads for the gym calendar: the climber dashboard (/me) and the desk's
// Events page (/desk/events). The climber side reads the signed-in climber's
// own gym; the desk side the signed-in staff member's. Never a gym named by
// the page (prisma/DATABASE.md, gym isolation).

// The climber's gym, read once per request however many cards ask.
const myGym = cache(getMyGym);

// A @db.Date column holds the calendar day at UTC midnight.
const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
const dayOf = (date: Date) => date.toISOString().slice(0, 10);

export type GymWeek = {
  timeZone: string;
  /** Today first, then the next six days. */
  days: DayHours[];
  status: OpenStatus;
  /** The gym's clock now, for the "now" cell on the busyness strips. */
  now: { weekday: number; hour: number };
};

async function loadSpecialDays(gymId: string, from: string, to: string): Promise<SpecialDay[]> {
  const rows = await db.specialHours.findMany({
    where: { gymId, removedAt: null, date: { gte: asDate(from), lte: asDate(to) } },
    // If two rows ever share a date, the newest wins in weekAhead.
    orderBy: { createdAt: "asc" },
    select: { date: true, closed: true, opensAt: true, closesAt: true, note: true },
  });
  return rows.map((r) => ({ ...r, day: dayOf(r.date) }));
}

async function loadGymWeek(gym: Gym, now: Date): Promise<GymWeek | null> {
  const today = gymClockAt(now, gym.timeZone);
  const [weekly, special] = await Promise.all([
    db.openingHours.findMany({
      where: { gymId: gym.id },
      select: { weekday: true, closed: true, opensAt: true, closesAt: true },
    }),
    loadSpecialDays(gym.id, today.day, addDays(today.day, 6)),
  ]);
  // A gym that hasn't set its hours shows none rather than "Closed" all week.
  if (weekly.length === 0) return null;
  const days = weekAhead(now, gym.timeZone, weekly, special);
  return {
    timeZone: gym.timeZone,
    days,
    status: openStatus(now, gym.timeZone, days),
    now: { weekday: today.weekday, hour: Math.floor(today.minutes / 60) },
  };
}

/** Today on the signed-in climber's gym's clock ("2026-11-03"), for the calendar view. */
export async function getMyGymToday(): Promise<string | null> {
  await connection();
  const gym = await myGym();
  return gym ? gymClockAt(new Date(), gym.timeZone).day : null;
}

/** The signed-in climber's gym hours for the week ahead. Null if it hasn't set them. */
export async function getMyGymWeek(): Promise<GymWeek | null> {
  await connection();
  const gym = await myGym();
  return gym ? loadGymWeek(gym, new Date()) : null;
}

export type Announcement = {
  id: string;
  title: string;
  details: string | null;
  /** "Sat, Nov 14 · 10 AM – 6 PM". */
  when: string;
  /** "In 12 days", "Tomorrow", "On now". */
  startsIn: string;
  canceled: boolean;
  /** The day it starts on the gym's clock ("2026-11-14"), for the calendar view. */
  day: string;
};

/**
 * Events coming up in the next 30 days, or on now, soonest first, at most
 * three. Canceled ones come after the rest, so they never crowd out an event
 * that is still on. Empty when there are none, and the dashboard then shows
 * no banner at all.
 */
export async function getMyAnnouncements(): Promise<Announcement[]> {
  const events = await loadMyEvents(ANNOUNCE_DAYS);
  // Stable, so each group stays soonest first.
  return events.sort((a, b) => Number(a.canceled) - Number(b.canceled)).slice(0, 3);
}

/** Every event on now or in the next 60 days, soonest first, canceled ones marked: the Events list. */
export async function getMyEvents(): Promise<Announcement[]> {
  return loadMyEvents(60);
}

async function loadMyEvents(days: number): Promise<Announcement[]> {
  await connection();
  const gym = await myGym();
  if (!gym) return [];
  const now = new Date();
  const rows = await db.gymEvent.findMany({
    where: {
      gymId: gym.id,
      startsAt: { lte: new Date(now.getTime() + days * DAY_MS) },
      // Started up to a week ago and maybe still on: eventEnd decides.
      OR: [{ endsAt: { gt: now } }, { endsAt: null, startsAt: { gt: new Date(now.getTime() - 7 * DAY_MS) } }],
    },
    orderBy: { startsAt: "asc" },
    select: { id: true, title: true, details: true, startsAt: true, endsAt: true, canceledAt: true },
  });
  return rows
    .filter((e) => eventEnd(e.startsAt, e.endsAt, gym.timeZone) > now)
    .map((e) => ({
      id: e.id,
      title: e.title,
      details: e.details,
      when: formatSpan(e.startsAt, e.endsAt, gym.timeZone),
      startsIn: startsIn(now, e.startsAt, gym.timeZone),
      canceled: e.canceledAt !== null,
      day: gymClockAt(e.startsAt, gym.timeZone).day,
    }));
}

export type SetChangeItem = {
  id: string;
  wall: string;
  note: string | null;
  state: SetChangeState;
  /** "Closed for setting Thu, Nov 5 · 9 AM – 2 PM", "New routes since Oct 30". */
  text: string;
};

const STATE_ORDER: Record<SetChangeState, number> = { now: 0, coming: 1, new: 2 };

/** Walls closed for setting now or soon, then the newest routes, at most five. */
export async function getMySetChanges(): Promise<SetChangeItem[]> {
  await connection();
  const gym = await myGym();
  if (!gym) return [];
  const now = new Date();
  const rows = await db.setChange.findMany({
    where: {
      gymId: gym.id,
      canceledAt: null,
      startsAt: { lte: new Date(now.getTime() + SET_CHANGE_AHEAD_DAYS * DAY_MS) },
      endsAt: { gte: new Date(now.getTime() - NEW_ROUTES_DAYS * DAY_MS) },
    },
    orderBy: { startsAt: "asc" },
    select: { id: true, wall: true, note: true, startsAt: true, endsAt: true },
  });
  const items = rows.map((row) => ({ row, state: setChangeState(now, row.startsAt, row.endsAt) }));
  // Closed now, then coming up (soonest first), then the newest routes first.
  items.sort(
    (a, b) =>
      STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
      (a.state === "new" ? b.row.endsAt.getTime() - a.row.endsAt.getTime() : 0),
  );
  return items.slice(0, 5).map(({ row: s, state }) => ({
    id: s.id,
    wall: s.wall,
    note: s.note,
    state,
    text:
      state === "coming"
        ? `Closed for setting ${formatSpan(s.startsAt, s.endsAt, gym.timeZone)}`
        : state === "now"
          ? `Closed for setting. New routes open ${describeMoment(now, s.endsAt, gym.timeZone)}`
          : `New routes since ${formatDay(gymClockAt(s.endsAt, gym.timeZone).day)}`,
  }));
}

export type ClassItem = {
  id: string;
  title: string;
  details: string | null;
  instructor: string | null;
  /** "Thu, Nov 5 · 6 PM – 7:30 PM". */
  when: string;
  /** The date block on the climber's list: "Thu" over "5", then "6 PM – 7:30 PM". */
  weekday: string;
  dayOfMonth: string;
  time: string;
  capacity: number;
  spotsLeft: number;
  /** "3 spots left" or "Full". */
  spots: string;
  booked: boolean;
  canceled: boolean;
  /** The day on the gym's clock ("2026-11-05"), for the calendar view. */
  day: string;
};

/**
 * Classes in the next two weeks the climber can sign up for, soonest first,
 * with whether they're signed up. A canceled class only shows to climbers who
 * were signed up, so they know.
 */
export async function getMyClasses(): Promise<ClassItem[]> {
  await connection();
  const [gym, climberId] = await Promise.all([myGym(), getSessionClimberId()]);
  if (!gym || !climberId) return [];
  const now = new Date();
  const rows = await db.gymClass.findMany({
    where: { gymId: gym.id, startsAt: { gt: now, lte: new Date(now.getTime() + CLASS_DAYS * DAY_MS) } },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      details: true,
      instructor: true,
      startsAt: true,
      durationMinutes: true,
      capacity: true,
      canceledAt: true,
      _count: { select: { bookings: { where: { canceledAt: null } } } },
      bookings: { where: { climberId, canceledAt: null }, select: { id: true } },
    },
  });
  return rows
    .filter((c) => !c.canceledAt || c.bookings.length > 0)
    .map((c) => {
      const left = spotsLeft(c.capacity, c._count.bookings);
      const start = gymClockAt(c.startsAt, gym.timeZone);
      return {
        id: c.id,
        title: c.title,
        details: c.details,
        instructor: c.instructor,
        when: formatSpan(c.startsAt, new Date(c.startsAt.getTime() + c.durationMinutes * 60_000), gym.timeZone),
        weekday: weekdayName(start.weekday),
        dayOfMonth: String(Number(start.day.slice(8))),
        time: formatClockRange(start.minutes, start.minutes + c.durationMinutes),
        capacity: c.capacity,
        spotsLeft: left,
        spots: describeSpots(left),
        booked: c.bookings.length > 0,
        canceled: c.canceledAt !== null,
        day: start.day,
      };
    });
}

// The desk's Events page: one reader per tab. Staff only, for the signed-in staff member's gym.

/** "06:00" for a time field; midnight at the end of the day is "00:00". */
function clockValue(minutes: number): string {
  const m = minutes % MINUTES_PER_DAY;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "1 h", "90 min", "1 h 30 min". */
function formatLength(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** The signed-in staff member's gym. */
export async function getDeskGym(): Promise<Gym | null> {
  const staff = await getStaffContext();
  return staff ? getGymById(staff.gymId) : null;
}

async function deskGym(): Promise<Gym | null> {
  await connection();
  await requireStaff();
  return getDeskGym();
}

export type DeskWeekday = { weekday: number; name: string; closed: boolean; opensAt: string; closesAt: string };

export type DeskHours = {
  /** False until staff save the regular week for the first time. */
  hoursSet: boolean;
  week: DeskWeekday[];
  specialDays: { id: string; date: string; hours: string; note: string | null }[];
};

// Shown in the form before a gym has saved its hours.
const DEFAULT_OPEN = { opensAt: 6 * 60, closesAt: 22 * 60 };

/** The Hours tab: the regular week and the special days from today on. */
export async function getDeskHours(): Promise<DeskHours | null> {
  const gym = await deskGym();
  if (!gym) return null;
  const today = gymClockAt(new Date(), gym.timeZone).day;
  const [weekly, special] = await Promise.all([
    db.openingHours.findMany({ where: { gymId: gym.id } }),
    db.specialHours.findMany({
      where: { gymId: gym.id, removedAt: null, date: { gte: asDate(today) } },
      orderBy: { date: "asc" },
    }),
  ]);
  const byWeekday = new Map(weekly.map((w) => [w.weekday, w]));
  return {
    hoursSet: weekly.length > 0,
    week: Array.from({ length: 7 }, (_, weekday) => {
      const row = byWeekday.get(weekday) ?? { closed: false, ...DEFAULT_OPEN };
      return {
        weekday,
        name: weekdayName(weekday),
        closed: row.closed,
        opensAt: clockValue(row.opensAt),
        closesAt: clockValue(row.closesAt),
      };
    }),
    specialDays: special.map((s) => ({
      id: s.id,
      date: formatDay(dayOf(s.date)),
      hours: describeHours(s.closed || s.opensAt === null || s.closesAt === null ? null : { opensAt: s.opensAt, closesAt: s.closesAt }),
      note: s.note,
    })),
  };
}

export type DeskClassType = {
  id: string;
  name: string;
  details: string | null;
  instructor: string | null;
  durationMinutes: number;
  capacity: number;
  /** "1 h · 8 places · with Sam". */
  summary: string;
  /** Sessions still to come. */
  upcoming: number;
};

/** The Class types tab: every type still offered, by name. */
export async function getDeskClassTypes(): Promise<DeskClassType[]> {
  const gym = await deskGym();
  if (!gym) return [];
  const types = await db.classType.findMany({
    where: { gymId: gym.id, active: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { classes: { where: { startsAt: { gt: new Date() }, canceledAt: null } } } } },
  });
  return types.map((t) => ({
    id: t.id,
    name: t.name,
    details: t.details,
    instructor: t.instructor,
    durationMinutes: t.durationMinutes,
    capacity: t.capacity,
    summary: [formatLength(t.durationMinutes), `${t.capacity} places`, t.instructor ? `with ${t.instructor}` : null]
      .filter(Boolean)
      .join(" · "),
    upcoming: t._count.classes,
  }));
}

export type DeskClass = {
  id: string;
  title: string;
  instructor: string | null;
  when: string;
  capacity: number;
  signedUp: string[];
  canceled: boolean;
};

/** The Classes tab: sessions from a week ago on, with who signed up. */
export async function getDeskClasses(): Promise<DeskClass[]> {
  const gym = await deskGym();
  if (!gym) return [];
  const classes = await db.gymClass.findMany({
    where: { gymId: gym.id, startsAt: { gte: new Date(Date.now() - 7 * DAY_MS) } },
    orderBy: { startsAt: "asc" },
    include: {
      bookings: {
        where: { canceledAt: null },
        orderBy: { createdAt: "asc" },
        select: { climber: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  return classes.map((c) => ({
    id: c.id,
    title: c.title,
    instructor: c.instructor,
    when: formatSpan(c.startsAt, new Date(c.startsAt.getTime() + c.durationMinutes * 60_000), gym.timeZone),
    capacity: c.capacity,
    // Staff see who is coming; climbers only ever see counts.
    signedUp: c.bookings.map((b) => `${b.climber.firstName} ${b.climber.lastName}`),
    canceled: c.canceledAt !== null,
  }));
}

export type DeskSetChange = { id: string; wall: string; note: string | null; when: string; canceled: boolean };

/** The Set changes tab: resets still on the climbers' list, and those coming up. */
export async function getDeskSetChanges(): Promise<DeskSetChange[]> {
  const gym = await deskGym();
  if (!gym) return [];
  const rows = await db.setChange.findMany({
    where: { gymId: gym.id, endsAt: { gte: new Date(Date.now() - NEW_ROUTES_DAYS * DAY_MS) } },
    orderBy: { startsAt: "asc" },
  });
  return rows.map((s) => ({
    id: s.id,
    wall: s.wall,
    note: s.note,
    when: formatSpan(s.startsAt, s.endsAt, gym.timeZone),
    canceled: s.canceledAt !== null,
  }));
}

export type DeskEvent = { id: string; title: string; details: string | null; when: string; canceled: boolean };

/** The Events tab: events from a week ago on. */
export async function getDeskEvents(): Promise<DeskEvent[]> {
  const gym = await deskGym();
  if (!gym) return [];
  const since = new Date(Date.now() - 7 * DAY_MS);
  const rows = await db.gymEvent.findMany({
    where: { gymId: gym.id, OR: [{ endsAt: { gte: since } }, { endsAt: null, startsAt: { gte: since } }] },
    orderBy: { startsAt: "asc" },
  });
  return rows.map((e) => ({
    id: e.id,
    title: e.title,
    details: e.details,
    when: formatSpan(e.startsAt, e.endsAt, gym.timeZone),
    canceled: e.canceledAt !== null,
  }));
}
