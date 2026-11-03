"use server";

import { revalidatePath } from "next/cache";
import { getSessionClimberId } from "@/features/auth/queries";
import { requireStaff } from "@/features/auth/staff";
import { getMyGym } from "@/features/purchase/queries";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/log";
import { getDeskGym } from "./queries";
import {
  checkClassSession,
  checkClassType,
  checkEvent,
  checkSetChange,
  checkSpecialDay,
  checkWeek,
  type ClassSessionInput,
  type ClassTypeInput,
  type EventInput,
  type SetChangeInput,
  type SpecialDayInput,
  type WeekInput,
} from "./validate";

// Server actions are public POST endpoints, so each one checks who is asking.
// Climbers act for themselves: the climber and their gym come from the
// session, never the request. Staff act on their own gym only. Typed text
// (names, notes) never goes in the logs, only ids and reason codes.

export type CalendarResult = { ok: true } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refreshCalendarPages() {
  revalidatePath("/me", "layout");
  // Every tab of the desk's Events page.
  revalidatePath("/desk/events", "layout");
}

// Climbers: class sign-up.

type SignUpOutcome = "booked" | "already" | "not_found" | "canceled" | "started" | "full";

const SIGN_UP_MESSAGE: Record<Exclude<SignUpOutcome, "booked" | "already">, string> = {
  not_found: "That class isn't on the schedule any more.",
  canceled: "That class was canceled.",
  started: "That class has already started.",
  full: "That class is full.",
};

/**
 * Signs the climber up for a class, if there's a place. Free for now. Signing
 * up twice is fine: the second time does nothing.
 */
export async function signUpForClass(classId: string): Promise<CalendarResult> {
  const climberId = await getSessionClimberId();
  if (!climberId) return { ok: false, message: "Log in to sign up for a class." };
  if (!UUID.test(String(classId))) return { ok: false, message: SIGN_UP_MESSAGE.not_found };
  const gym = await getMyGym();
  if (!gym) return { ok: false, message: "Log in to sign up for a class." };

  const now = new Date();
  const outcome = await db.$transaction(async (tx): Promise<SignUpOutcome> => {
    // Lock the class row, so two climbers can't both take the last place:
    // the second waits here, then counts the first one's booking.
    const [found] = await tx.$queryRaw<{ capacity: number; startsAt: Date; canceledAt: Date | null }[]>`
      SELECT "capacity", "startsAt", "canceledAt" FROM "GymClass"
      WHERE "id" = ${classId} AND "gymId" = ${gym.id}
      FOR UPDATE`;
    if (!found) return "not_found";
    if (found.canceledAt) return "canceled";
    if (found.startsAt <= now) return "started";
    const existing = await tx.classBooking.findUnique({
      where: { classId_climberId: { classId, climberId } },
      select: { canceledAt: true },
    });
    if (existing && !existing.canceledAt) return "already";
    const booked = await tx.classBooking.count({ where: { classId, gymId: gym.id, canceledAt: null } });
    if (booked >= found.capacity) return "full";
    if (existing) {
      await tx.classBooking.update({
        where: { classId_climberId: { classId, climberId } },
        data: { canceledAt: null },
      });
    } else {
      await tx.classBooking.create({ data: { gymId: gym.id, classId, climberId } });
    }
    return "booked";
  });

  if (outcome === "booked" || outcome === "already") {
    if (outcome === "booked") logEvent("class_booked", { gymId: gym.id, classId, climberId });
    refreshCalendarPages();
    return { ok: true };
  }
  logEvent("class_booking_refused", { gymId: gym.id, classId, climberId, reason: outcome });
  // Someone else may have taken the last place: show the new count.
  refreshCalendarPages();
  return { ok: false, message: SIGN_UP_MESSAGE[outcome] };
}

/** Gives up the climber's place in a class. Cancelling twice is fine. */
export async function cancelClassBooking(classId: string): Promise<CalendarResult> {
  const climberId = await getSessionClimberId();
  if (!climberId) return { ok: false, message: "Log in to change your classes." };
  if (!UUID.test(String(classId))) return { ok: false, message: SIGN_UP_MESSAGE.not_found };
  const gym = await getMyGym();
  if (!gym) return { ok: false, message: "Log in to change your classes." };
  const { count } = await db.classBooking.updateMany({
    where: { classId, climberId, gymId: gym.id, canceledAt: null },
    data: { canceledAt: new Date() },
  });
  if (count > 0) logEvent("class_booking_canceled", { gymId: gym.id, classId, climberId });
  refreshCalendarPages();
  return { ok: true };
}

// Staff: the calendar on /desk/events.

async function staffGym() {
  await requireStaff();
  return getDeskGym();
}

const LOG_IN_AGAIN: CalendarResult = { ok: false, message: "Log in again to change the calendar." };

/** Saves the regular week, all seven days at once. */
export async function saveOpeningHours(input: WeekInput): Promise<CalendarResult> {
  const gym = await staffGym();
  if (!gym) return LOG_IN_AGAIN;
  const checked = checkWeek(input);
  if (!checked.ok) return checked;
  await db.$transaction(
    checked.data.map(({ weekday, closed, opensAt, closesAt }) =>
      db.openingHours.upsert({
        where: { gymId_weekday: { gymId: gym.id, weekday } },
        update: { closed, opensAt, closesAt },
        create: { gymId: gym.id, weekday, closed, opensAt, closesAt },
      }),
    ),
  );
  logEvent("opening_hours_saved", { gymId: gym.id });
  refreshCalendarPages();
  return { ok: true };
}

/** Sets the hours for one date. A date that already has special hours is replaced. */
export async function addSpecialHours(input: SpecialDayInput): Promise<CalendarResult> {
  const gym = await staffGym();
  if (!gym) return LOG_IN_AGAIN;
  const checked = checkSpecialDay(input);
  if (!checked.ok) return checked;
  const { day, ...hours } = checked.data;
  const date = new Date(`${day}T00:00:00Z`);
  await db.$transaction([
    db.specialHours.updateMany({ where: { gymId: gym.id, date, removedAt: null }, data: { removedAt: new Date() } }),
    db.specialHours.create({ data: { gymId: gym.id, date, ...hours } }),
  ]);
  logEvent("special_hours_added", { gymId: gym.id, day });
  refreshCalendarPages();
  return { ok: true };
}

/** Takes a special day off; the regular hours apply again. */
export async function removeSpecialHours(id: string): Promise<CalendarResult> {
  const gym = await staffGym();
  if (!gym) return LOG_IN_AGAIN;
  if (!UUID.test(String(id))) return { ok: false, message: "That day isn't on the calendar." };
  await db.specialHours.updateMany({ where: { id, gymId: gym.id, removedAt: null }, data: { removedAt: new Date() } });
  logEvent("special_hours_removed", { gymId: gym.id, id });
  refreshCalendarPages();
  return { ok: true };
}

/** Announces an event. Climbers see it at the top of their dashboard. */
export async function addEvent(input: EventInput): Promise<CalendarResult> {
  const gym = await staffGym();
  if (!gym) return LOG_IN_AGAIN;
  const checked = checkEvent(input, gym.timeZone);
  if (!checked.ok) return checked;
  const { id } = await db.gymEvent.create({ data: { gymId: gym.id, ...checked.data }, select: { id: true } });
  logEvent("event_added", { gymId: gym.id, id });
  refreshCalendarPages();
  return { ok: true };
}

/** Plans a wall reset. */
export async function addSetChange(input: SetChangeInput): Promise<CalendarResult> {
  const gym = await staffGym();
  if (!gym) return LOG_IN_AGAIN;
  const checked = checkSetChange(input, gym.timeZone);
  if (!checked.ok) return checked;
  const { id } = await db.setChange.create({ data: { gymId: gym.id, ...checked.data }, select: { id: true } });
  logEvent("set_change_added", { gymId: gym.id, id });
  refreshCalendarPages();
  return { ok: true };
}

const NAME_TAKEN: CalendarResult = { ok: false, message: "There's already a class type with that name." };

/**
 * Adds a kind of class. A name used by an archived type brings that type back with the new
 * details, so names stay unique per gym.
 */
export async function addClassType(input: ClassTypeInput): Promise<CalendarResult> {
  const gym = await staffGym();
  if (!gym) return LOG_IN_AGAIN;
  const checked = checkClassType(input);
  if (!checked.ok) return checked;
  const existing = await db.classType.findUnique({
    where: { gymId_name: { gymId: gym.id, name: checked.data.name } },
    select: { id: true, active: true },
  });
  if (existing?.active) return NAME_TAKEN;
  const { id } = existing
    ? await db.classType.update({ where: { id: existing.id }, data: { ...checked.data, active: true }, select: { id: true } })
    : await db.classType.create({ data: { gymId: gym.id, ...checked.data }, select: { id: true } });
  logEvent("class_type_saved", { gymId: gym.id, id });
  refreshCalendarPages();
  return { ok: true };
}

/** Changes a class type. Sessions already scheduled keep the details they were made with. */
export async function updateClassType(id: string, input: ClassTypeInput): Promise<CalendarResult> {
  const gym = await staffGym();
  if (!gym) return LOG_IN_AGAIN;
  if (!UUID.test(String(id))) return { ok: false, message: "That class type doesn't exist." };
  const checked = checkClassType(input);
  if (!checked.ok) return checked;
  const clash = await db.classType.findFirst({
    where: { gymId: gym.id, name: checked.data.name, id: { not: id } },
    select: { id: true },
  });
  if (clash) return NAME_TAKEN;
  const { count } = await db.classType.updateMany({ where: { id, gymId: gym.id }, data: checked.data });
  if (count === 0) return { ok: false, message: "That class type doesn't exist." };
  logEvent("class_type_saved", { gymId: gym.id, id });
  refreshCalendarPages();
  return { ok: true };
}

/**
 * Schedules a session of a class type climbers can sign up for. It copies the type's name,
 * details, length, instructor and places, unless the session names its own instructor or
 * places.
 */
export async function addClass(input: ClassSessionInput): Promise<CalendarResult> {
  const gym = await staffGym();
  if (!gym) return LOG_IN_AGAIN;
  const checked = checkClassSession(input, gym.timeZone, new Date());
  if (!checked.ok) return checked;
  const type = await db.classType.findFirst({
    where: { id: checked.data.classTypeId, gymId: gym.id, active: true },
  });
  if (!type) return { ok: false, message: "Pick a class type." };
  const { id } = await db.gymClass.create({
    data: {
      gymId: gym.id,
      classTypeId: type.id,
      title: type.name,
      details: type.details,
      instructor: checked.data.instructor ?? type.instructor,
      startsAt: checked.data.startsAt,
      durationMinutes: type.durationMinutes,
      capacity: checked.data.capacity ?? type.capacity,
    },
    select: { id: true },
  });
  logEvent("class_added", { gymId: gym.id, id, classTypeId: type.id });
  refreshCalendarPages();
  return { ok: true };
}

export type CalendarKind = "event" | "setChange" | "class" | "classType";

/**
 * Cancels an event, set change or class, or archives a class type. The row stays: climbers
 * who planned on an event or signed up for a class see it was canceled, and an archived type's
 * sessions already scheduled stay on. Doing it twice is fine.
 */
export async function cancelCalendarItem(kind: CalendarKind, id: string): Promise<CalendarResult> {
  const gym = await staffGym();
  if (!gym) return LOG_IN_AGAIN;
  if (!UUID.test(String(id))) return { ok: false, message: "That isn't on the calendar." };
  if (kind === "classType") {
    const { count } = await db.classType.updateMany({ where: { id, gymId: gym.id, active: true }, data: { active: false } });
    if (count > 0) logEvent("class_type_archived", { gymId: gym.id, id });
    refreshCalendarPages();
    return { ok: true };
  }
  const where = { id, gymId: gym.id, canceledAt: null };
  const data = { canceledAt: new Date() };
  let count = 0;
  if (kind === "event") ({ count } = await db.gymEvent.updateMany({ where, data }));
  else if (kind === "setChange") ({ count } = await db.setChange.updateMany({ where, data }));
  else if (kind === "class") ({ count } = await db.gymClass.updateMany({ where, data }));
  else return { ok: false, message: "That isn't on the calendar." };
  if (count > 0) logEvent("calendar_item_canceled", { gymId: gym.id, kind, id });
  refreshCalendarPages();
  return { ok: true };
}
