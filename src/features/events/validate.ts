// Checks what staff type into the calendar forms on /desk/events. Pure: the
// actions call these, then save. Dates and times arrive as the browser's
// date and time fields send them ("2026-11-05T18:00", "06:00"), on the gym's
// clock, and are turned into real moments with the gym's time zone.
import { gymTime, MINUTES_PER_DAY } from "./time";
import type { WeeklyHours } from "./hours";

export type Checked<T> = { ok: true; data: T } | { ok: false; message: string };

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;
// Some browsers add ":00" seconds.
const DATE_TIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::00)?$/;

export const LIMITS = {
  title: 80,
  details: 500,
  wall: 40,
  note: 200,
  instructor: 60,
  capacity: 200,
  durationMinutes: 8 * 60,
};

/** A real calendar day like "2026-11-05", or null. */
export function parseDay(value: unknown): string | null {
  const match = DAY.exec(String(value ?? ""));
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? match[0] : null;
}

/**
 * "06:00" -> 360. With `closing`, "00:00" is midnight at the end of the day
 * (1440), so a gym can close at midnight.
 */
export function parseClock(value: unknown, closing = false): number | null {
  const match = CLOCK.exec(String(value ?? ""));
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return closing && minutes === 0 ? MINUTES_PER_DAY : minutes;
}

/** "2026-11-05T18:00" on the gym's clock -> the moment it happens. */
export function parseDateTime(value: unknown, timeZone: string): Date | null {
  const match = DATE_TIME.exec(String(value ?? ""));
  if (!match) return null;
  const day = parseDay(match[1]);
  const minutes = parseClock(match[2]);
  return day && minutes !== null ? gymTime(day, minutes, timeZone) : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Optional text: empty becomes null.
function optional(value: unknown): string | null {
  return text(value) || null;
}

function tooLong(value: string | null, max: number): boolean {
  return (value?.length ?? 0) > max;
}

export type WeekInput = { weekday: number; closed: boolean; opensAt: string; closesAt: string }[];

/** All seven days of the regular week. */
export function checkWeek(input: unknown): Checked<WeeklyHours[]> {
  if (!Array.isArray(input) || input.length !== 7) return { ok: false, message: "Something went wrong. Reload and try again." };
  const days: WeeklyHours[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    const row = input.find((r) => r && typeof r === "object" && r.weekday === weekday);
    if (!row) return { ok: false, message: "Something went wrong. Reload and try again." };
    const closed = row.closed === true;
    const opensAt = parseClock(row.opensAt);
    const closesAt = parseClock(row.closesAt, true);
    if (!closed && (opensAt === null || closesAt === null)) {
      return { ok: false, message: "Enter an opening and closing time for every open day." };
    }
    if (!closed && opensAt! >= closesAt!) {
      return { ok: false, message: "Closing time has to be after opening time." };
    }
    // A closed day keeps its times, so ticking it open again brings them back.
    days.push({ weekday, closed, opensAt: opensAt ?? 360, closesAt: closesAt ?? 1320 });
  }
  return { ok: true, data: days };
}

export type SpecialDayInput = { date: string; closed: boolean; opensAt?: string; closesAt?: string; note?: string };

export function checkSpecialDay(
  input: SpecialDayInput,
): Checked<{ day: string; closed: boolean; opensAt: number | null; closesAt: number | null; note: string | null }> {
  const day = parseDay(input?.date);
  if (!day) return { ok: false, message: "Pick a date." };
  const note = optional(input.note);
  if (tooLong(note, LIMITS.note)) return { ok: false, message: `Keep the note under ${LIMITS.note} characters.` };
  if (input.closed === true) return { ok: true, data: { day, closed: true, opensAt: null, closesAt: null, note } };
  const opensAt = parseClock(input.opensAt);
  const closesAt = parseClock(input.closesAt, true);
  if (opensAt === null || closesAt === null) return { ok: false, message: "Enter opening and closing times, or tick Closed." };
  if (opensAt >= closesAt) return { ok: false, message: "Closing time has to be after opening time." };
  return { ok: true, data: { day, closed: false, opensAt, closesAt, note } };
}

export type EventInput = { title: string; details?: string; startsAt: string; endsAt?: string };

export function checkEvent(
  input: EventInput,
  timeZone: string,
): Checked<{ title: string; details: string | null; startsAt: Date; endsAt: Date | null }> {
  const title = text(input?.title);
  const details = optional(input?.details);
  if (!title) return { ok: false, message: "Give the event a name." };
  if (title.length > LIMITS.title) return { ok: false, message: `Keep the name under ${LIMITS.title} characters.` };
  if (tooLong(details, LIMITS.details)) return { ok: false, message: `Keep the details under ${LIMITS.details} characters.` };
  const startsAt = parseDateTime(input.startsAt, timeZone);
  if (!startsAt) return { ok: false, message: "Pick when it starts." };
  const endsAt = text(input.endsAt) ? parseDateTime(input.endsAt, timeZone) : null;
  if (text(input.endsAt) && !endsAt) return { ok: false, message: "Pick when it ends, or leave it empty." };
  if (endsAt && endsAt <= startsAt) return { ok: false, message: "It has to end after it starts." };
  return { ok: true, data: { title, details, startsAt, endsAt } };
}

export type SetChangeInput = { wall: string; startsAt: string; endsAt: string; note?: string };

export function checkSetChange(
  input: SetChangeInput,
  timeZone: string,
): Checked<{ wall: string; startsAt: Date; endsAt: Date; note: string | null }> {
  const wall = text(input?.wall);
  const note = optional(input?.note);
  if (!wall) return { ok: false, message: "Say which wall is being reset." };
  if (wall.length > LIMITS.wall) return { ok: false, message: `Keep the wall name under ${LIMITS.wall} characters.` };
  if (tooLong(note, LIMITS.note)) return { ok: false, message: `Keep the note under ${LIMITS.note} characters.` };
  const startsAt = parseDateTime(input.startsAt, timeZone);
  const endsAt = parseDateTime(input.endsAt, timeZone);
  if (!startsAt) return { ok: false, message: "Pick when the wall closes." };
  if (!endsAt) return { ok: false, message: "Pick when the new routes open." };
  if (endsAt <= startsAt) return { ok: false, message: "The new routes have to open after the wall closes." };
  return { ok: true, data: { wall, startsAt, endsAt, note } };
}

export type ClassTypeInput = {
  name: string;
  details?: string;
  instructor?: string;
  durationMinutes: string;
  capacity: string;
};

function checkInstructor(value: unknown): Checked<string | null> {
  const instructor = optional(value);
  if (tooLong(instructor, LIMITS.instructor)) {
    return { ok: false, message: `Keep the instructor's name under ${LIMITS.instructor} characters.` };
  }
  return { ok: true, data: instructor };
}

function checkCapacity(value: unknown): Checked<number> {
  const capacity = Number(text(value));
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > LIMITS.capacity) {
    return { ok: false, message: `Enter how many places there are, from 1 to ${LIMITS.capacity}.` };
  }
  return { ok: true, data: capacity };
}

/** A kind of class: its name, details, usual instructor, length and places. */
export function checkClassType(input: ClassTypeInput): Checked<{
  name: string;
  details: string | null;
  instructor: string | null;
  durationMinutes: number;
  capacity: number;
}> {
  const name = text(input?.name);
  const details = optional(input?.details);
  if (!name) return { ok: false, message: "Give the class a name." };
  if (name.length > LIMITS.title) return { ok: false, message: `Keep the name under ${LIMITS.title} characters.` };
  if (tooLong(details, LIMITS.details)) return { ok: false, message: `Keep the details under ${LIMITS.details} characters.` };
  const instructor = checkInstructor(input.instructor);
  if (!instructor.ok) return instructor;
  const durationMinutes = Number(text(input.durationMinutes));
  if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > LIMITS.durationMinutes) {
    return { ok: false, message: "Enter how long it runs, between 15 and 480 minutes." };
  }
  const capacity = checkCapacity(input.capacity);
  if (!capacity.ok) return capacity;
  return { ok: true, data: { name, details, instructor: instructor.data, durationMinutes, capacity: capacity.data } };
}

export type ClassSessionInput = {
  classTypeId: string;
  startsAt: string;
  /** Leave empty for the type's usual instructor. */
  instructor?: string;
  /** Leave empty for the type's places. */
  capacity?: string;
};

/**
 * A session of a class type. The type's own checks happen in the action, which reads it from
 * the database; this checks the time and the optional overrides.
 */
export function checkClassSession(
  input: ClassSessionInput,
  timeZone: string,
  now: Date,
): Checked<{ classTypeId: string; startsAt: Date; instructor: string | null; capacity: number | null }> {
  const classTypeId = text(input?.classTypeId);
  if (!/^[0-9a-f-]{36}$/i.test(classTypeId)) return { ok: false, message: "Pick a class type." };
  const startsAt = parseDateTime(input.startsAt, timeZone);
  if (!startsAt) return { ok: false, message: "Pick when the class starts." };
  if (startsAt <= now) return { ok: false, message: "Pick a time that hasn't passed yet." };
  const instructor = checkInstructor(input.instructor);
  if (!instructor.ok) return instructor;
  let capacity: number | null = null;
  if (text(input.capacity)) {
    const checked = checkCapacity(input.capacity);
    if (!checked.ok) return checked;
    capacity = checked.data;
  }
  return { ok: true, data: { classTypeId, startsAt, instructor: instructor.data, capacity } };
}
