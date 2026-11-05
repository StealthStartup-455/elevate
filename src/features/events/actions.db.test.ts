// Needs a Postgres database with the migrations applied (DATABASE_URL).
// Run with `npm run test:db`; CI runs it against its own database.
// The gym calendar (#101): class sign-up, and staff keeping hours and events.
import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

const SLUG = "test-calendar";
const OTHER_SLUG = "test-calendar-other";
const session = vi.hoisted(() => ({ climberId: null as string | null, staff: false }));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));
vi.mock("@/features/auth/queries", () => ({
  getSessionClimberId: async () => session.climberId,
  getCurrentUser: async () =>
    session.climberId ? { authUserId: "test", staff: null, climberIds: [session.climberId] } : null,
}));
vi.mock("@/features/auth/session", () => ({ getDemoClimberId: async () => null }));
vi.mock("@/features/auth/staff", () => ({
  isStaff: async () => session.staff,
  requireStaff: async () => {
    if (!session.staff) throw new Error("redirect /login");
  },
  getStaffContext: async () =>
    session.staff
      ? { id: null, gymId: (await db.gym.findUniqueOrThrow({ where: { slug: SLUG } })).id, role: "DESK" }
      : null,
}));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn() }));
vi.mock("@/lib/gym", () => ({
  getGym: async () => {
    throw new Error("getGym() must not be used: take the climber's or staff member's own gym");
  },
  getGymById: async (id: string) => db.gym.findUnique({ where: { id } }),
}));

const actions = await import("./actions");
const queries = await import("./queries");

const HOUR = 60 * 60 * 1000;
let gymId = "";
let otherGymId = "";
const climbers: string[] = [];
let otherClimber = "";

beforeAll(async () => {
  await cleanUp();
  gymId = (await db.gym.create({ data: { name: "Calendar test gym", slug: SLUG } })).id;
  otherGymId = (await db.gym.create({ data: { name: "Other calendar gym", slug: OTHER_SLUG } })).id;
  for (const firstName of ["Ana", "Ben", "Cy"]) {
    const climber = await db.climber.create({
      data: { gymId, firstName, lastName: "Test", dateOfBirth: new Date("1990-01-01") },
    });
    climbers.push(climber.id);
  }
  otherClimber = (
    await db.climber.create({
      data: { gymId: otherGymId, firstName: "Dee", lastName: "Test", dateOfBirth: new Date("1990-01-01") },
    })
  ).id;
});

beforeEach(() => {
  session.climberId = null;
  session.staff = false;
});

afterAll(async () => {
  await cleanUp();
  await db.$disconnect();
});

async function cleanUp() {
  for (const slug of [SLUG, OTHER_SLUG]) {
    const gym = await db.gym.findUnique({ where: { slug } });
    if (!gym) continue;
    const where = { where: { gymId: gym.id } };
    await db.classBooking.deleteMany(where);
    await db.gymClass.deleteMany(where);
    await db.classType.deleteMany(where);
    await db.gymEvent.deleteMany(where);
    await db.setChange.deleteMany(where);
    await db.specialHours.deleteMany(where);
    await db.openingHours.deleteMany(where);
    await db.climber.deleteMany(where);
    await db.gym.delete({ where: { id: gym.id } });
  }
}

async function makeClass(data: { capacity?: number; startsIn?: number; gym?: string; canceled?: boolean } = {}) {
  const created = await db.gymClass.create({
    data: {
      gymId: data.gym ?? gymId,
      title: "Intro",
      startsAt: new Date(Date.now() + (data.startsIn ?? 24) * HOUR),
      durationMinutes: 60,
      capacity: data.capacity ?? 2,
      canceledAt: data.canceled ? new Date() : null,
    },
  });
  return created.id;
}

const activeBookings = (classId: string) => db.classBooking.count({ where: { classId, canceledAt: null } });

describe("signing up for a class", () => {
  it("needs a signed-in climber", async () => {
    const classId = await makeClass();
    expect(await actions.signUpForClass(classId)).toEqual({ ok: false, message: "Log in to sign up for a class." });
  });

  it("takes a place, once however often they press", async () => {
    const classId = await makeClass();
    session.climberId = climbers[0];
    expect(await actions.signUpForClass(classId)).toEqual({ ok: true });
    expect(await actions.signUpForClass(classId)).toEqual({ ok: true });
    expect(await db.classBooking.count({ where: { classId } })).toBe(1);
  });

  it("stops at capacity, and a cancelled place can be taken again", async () => {
    const classId = await makeClass({ capacity: 2 });
    session.climberId = climbers[0];
    await actions.signUpForClass(classId);
    session.climberId = climbers[1];
    await actions.signUpForClass(classId);
    session.climberId = climbers[2];
    expect(await actions.signUpForClass(classId)).toEqual({ ok: false, message: "That class is full." });

    session.climberId = climbers[0];
    expect(await actions.cancelClassBooking(classId)).toEqual({ ok: true });
    session.climberId = climbers[2];
    expect(await actions.signUpForClass(classId)).toEqual({ ok: true });
    // Signing up again after cancelling reuses the climber's row.
    session.climberId = climbers[0];
    expect(await actions.signUpForClass(classId)).toEqual({ ok: false, message: "That class is full." });
    expect(await activeBookings(classId)).toBe(2);
  });

  it("gives the last place to one of two climbers pressing at once", async () => {
    const classId = await makeClass({ capacity: 1 });
    session.climberId = climbers[0];
    const first = actions.signUpForClass(classId);
    session.climberId = climbers[1];
    const second = actions.signUpForClass(classId);
    const results = await Promise.all([first, second]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await activeBookings(classId)).toBe(1);
  });

  it("refuses a canceled class, one that has started, and another gym's", async () => {
    session.climberId = climbers[0];
    expect(await actions.signUpForClass(await makeClass({ canceled: true }))).toEqual({
      ok: false,
      message: "That class was canceled.",
    });
    expect(await actions.signUpForClass(await makeClass({ startsIn: -1 }))).toEqual({
      ok: false,
      message: "That class has already started.",
    });
    const theirs = await makeClass({ gym: otherGymId });
    expect(await actions.signUpForClass(theirs)).toEqual({
      ok: false,
      message: "That class isn't on the schedule any more.",
    });
    expect(await db.classBooking.count({ where: { classId: theirs } })).toBe(0);
  });

  it("cancels only the climber's own place", async () => {
    const classId = await makeClass();
    session.climberId = climbers[0];
    await actions.signUpForClass(classId);
    session.climberId = climbers[1];
    await actions.signUpForClass(classId);
    expect(await actions.cancelClassBooking(classId)).toEqual({ ok: true });
    expect(await actions.cancelClassBooking(classId)).toEqual({ ok: true });
    const left = await db.classBooking.findMany({ where: { classId, canceledAt: null }, select: { climberId: true } });
    expect(left).toEqual([{ climberId: climbers[0] }]);
  });
});

describe("the climber's class list", () => {
  it("shows places left and whether they're signed up, and a canceled class only to those signed up", async () => {
    await db.classBooking.deleteMany({ where: { gymId } });
    await db.gymClass.deleteMany({ where: { gymId } });
    const open = await makeClass({ capacity: 3 });
    const canceled = await makeClass({ capacity: 3 });
    session.climberId = climbers[0];
    await actions.signUpForClass(open);
    await actions.signUpForClass(canceled);
    await db.gymClass.update({ where: { id: canceled }, data: { canceledAt: new Date() } });

    const mine = await queries.getMyClasses();
    expect(mine.find((c) => c.id === open)).toMatchObject({ booked: true, spotsLeft: 2, spots: "2 spots left" });
    expect(mine.find((c) => c.id === canceled)).toMatchObject({ canceled: true, booked: true });

    session.climberId = climbers[1];
    const theirs = await queries.getMyClasses();
    expect(theirs.map((c) => c.id)).toEqual([open]);
    expect(theirs[0]).toMatchObject({ booked: false, spotsLeft: 2 });
  });
});

describe("staff keeping the calendar", () => {
  const week = (opensAt = "06:00") =>
    Array.from({ length: 7 }, (_, weekday) => ({ weekday, closed: weekday === 6, opensAt, closesAt: "22:00" }));

  it("is staff only", async () => {
    await expect(actions.saveOpeningHours(week())).rejects.toThrow("redirect /login");
    await expect(actions.addEvent({ title: "Comp", startsAt: "2030-01-01T10:00" })).rejects.toThrow("redirect /login");
  });

  it("saves the week, and climbers see it", async () => {
    session.climberId = climbers[0];
    expect(await queries.getMyGymWeek()).toBeNull();

    session.staff = true;
    expect(await actions.saveOpeningHours(week())).toEqual({ ok: true });
    expect(await actions.saveOpeningHours(week("07:00"))).toEqual({ ok: true });
    const rows = await db.openingHours.findMany({ where: { gymId }, orderBy: { weekday: "asc" } });
    expect(rows).toHaveLength(7);
    expect(rows[0]).toMatchObject({ opensAt: 420, closesAt: 1320, closed: false });
    expect(rows[6].closed).toBe(true);

    const gymWeek = await queries.getMyGymWeek();
    expect(gymWeek?.days).toHaveLength(7);
    expect(gymWeek?.days.filter((d) => d.hours === null)).toHaveLength(1);
  });

  it("keeps one special day per date, and removes it without deleting", async () => {
    session.staff = true;
    const day = new Date(Date.now() + 48 * HOUR).toISOString().slice(0, 10);
    await actions.addSpecialHours({ date: day, closed: true, note: "First" });
    await actions.addSpecialHours({ date: day, closed: false, opensAt: "10:00", closesAt: "16:00", note: "Second" });
    const active = await db.specialHours.findMany({ where: { gymId, removedAt: null } });
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({ note: "Second", opensAt: 600, closesAt: 960 });

    expect(await actions.removeSpecialHours(active[0].id)).toEqual({ ok: true });
    expect(await db.specialHours.count({ where: { gymId, removedAt: null } })).toBe(0);
    expect(await db.specialHours.count({ where: { gymId } })).toBe(2);
  });

  it("announces an event to climbers, and cancelling marks it", async () => {
    session.staff = true;
    const start = new Date(Date.now() + 72 * HOUR).toISOString().slice(0, 16);
    expect(await actions.addEvent({ title: "Bouldering comp", startsAt: start })).toEqual({ ok: true });
    const event = await db.gymEvent.findFirstOrThrow({ where: { gymId, title: "Bouldering comp" } });

    session.climberId = climbers[0];
    expect(await queries.getMyAnnouncements()).toEqual([
      expect.objectContaining({ id: event.id, title: "Bouldering comp", canceled: false }),
    ]);

    expect(await actions.cancelCalendarItem("event", event.id)).toEqual({ ok: true });
    expect(await queries.getMyAnnouncements()).toEqual([expect.objectContaining({ id: event.id, canceled: true })]);
  });

  it("puts canceled events after the ones still on, so they never crowd them out", async () => {
    await db.gymEvent.deleteMany({ where: { gymId } });
    const soon = (hours: number) => new Date(Date.now() + hours * HOUR);
    await db.gymEvent.createMany({
      data: [
        { gymId, title: "Canceled first", startsAt: soon(1), canceledAt: new Date() },
        { gymId, title: "Canceled second", startsAt: soon(2), canceledAt: new Date() },
        { gymId, title: "Film night", startsAt: soon(48) },
        { gymId, title: "Comp", startsAt: soon(96) },
      ],
    });
    session.climberId = climbers[0];
    expect((await queries.getMyAnnouncements()).map((e) => e.title)).toEqual(["Film night", "Comp", "Canceled first"]);
  });

  it("refuses bad input with a message", async () => {
    session.staff = true;
    expect(await actions.addClassType({ name: "", durationMinutes: "60", capacity: "8" })).toEqual({
      ok: false,
      message: "Give the class a name.",
    });
    expect(await actions.addClass({ classTypeId: "", startsAt: "" })).toEqual({ ok: false, message: "Pick a class type." });
  });

  it("never touches another gym's calendar", async () => {
    session.staff = true;
    const theirs = await db.gymEvent.create({
      data: { gymId: otherGymId, title: "Their comp", startsAt: new Date(Date.now() + 24 * HOUR) },
    });
    expect(await actions.cancelCalendarItem("event", theirs.id)).toEqual({ ok: true });
    expect((await db.gymEvent.findUniqueOrThrow({ where: { id: theirs.id } })).canceledAt).toBeNull();

    // And a climber of the other gym never sees this gym's events.
    session.climberId = otherClimber;
    const seen = await queries.getMyAnnouncements();
    expect(seen.map((e) => e.title)).toEqual(["Their comp"]);
  });
});

describe("class types and the sessions scheduled from them", () => {
  const later = (hours: number) => {
    // A datetime-local value on the test gym's clock (America/Vancouver, the default).
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Vancouver",
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
        .formatToParts(new Date(Date.now() + hours * HOUR))
        .map((p) => [p.type, p.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  };
  const type = { name: "Footwork clinic", durationMinutes: "90", capacity: "6", instructor: "Priya", details: "Quiet feet." };

  it("are staff only", async () => {
    await expect(actions.addClassType(type)).rejects.toThrow("redirect /login");
  });

  it("keeps names unique, and an archived name comes back with the new details", async () => {
    session.staff = true;
    expect(await actions.addClassType(type)).toEqual({ ok: true });
    expect(await actions.addClassType(type)).toEqual({ ok: false, message: "There's already a class type with that name." });
    const saved = await db.classType.findFirstOrThrow({ where: { gymId, name: type.name } });

    expect(await actions.cancelCalendarItem("classType", saved.id)).toEqual({ ok: true });
    expect((await queries.getDeskClassTypes()).map((t) => t.name)).not.toContain(type.name);
    expect(await actions.addClassType({ ...type, capacity: "10" })).toEqual({ ok: true });
    const back = await db.classType.findUniqueOrThrow({ where: { id: saved.id } });
    expect(back).toMatchObject({ active: true, capacity: 10 });
    expect(await db.classType.count({ where: { gymId, name: type.name } })).toBe(1);
  });

  it("schedules a session as a copy of its type, with its own instructor or places if given", async () => {
    session.staff = true;
    const t = await db.classType.findFirstOrThrow({ where: { gymId, name: type.name } });
    expect(await actions.addClass({ classTypeId: t.id, startsAt: later(48) })).toEqual({ ok: true });
    expect(await actions.addClass({ classTypeId: t.id, startsAt: later(72), instructor: "Sam", capacity: "3" })).toEqual({
      ok: true,
    });
    const sessions = await db.gymClass.findMany({ where: { classTypeId: t.id }, orderBy: { startsAt: "asc" } });
    expect(sessions.map(({ title, details, durationMinutes, instructor, capacity }) => ({ title, details, durationMinutes, instructor, capacity }))).toEqual([
      { title: "Footwork clinic", details: "Quiet feet.", durationMinutes: 90, instructor: "Priya", capacity: 10 },
      { title: "Footwork clinic", details: "Quiet feet.", durationMinutes: 90, instructor: "Sam", capacity: 3 },
    ]);

    // Editing the type leaves the sessions already scheduled as they were.
    expect(await actions.updateClassType(t.id, { ...type, name: "Footwork 101", capacity: "4" })).toEqual({ ok: true });
    const after = await db.gymClass.findMany({ where: { classTypeId: t.id }, select: { title: true, capacity: true } });
    expect(after.map((s) => s.title)).toEqual(["Footwork clinic", "Footwork clinic"]);
    expect((await queries.getDeskClassTypes()).find((x) => x.id === t.id)).toMatchObject({ name: "Footwork 101", upcoming: 2 });
  });

  it("refuses an archived type and another gym's type", async () => {
    session.staff = true;
    const archived = await db.classType.create({
      data: { gymId, name: "Old class", durationMinutes: 60, capacity: 5, active: false },
    });
    const theirs = await db.classType.create({
      data: { gymId: otherGymId, name: "Their class", durationMinutes: 60, capacity: 5 },
    });
    for (const id of [archived.id, theirs.id]) {
      expect(await actions.addClass({ classTypeId: id, startsAt: later(48) })).toEqual({ ok: false, message: "Pick a class type." });
    }
    expect(await actions.updateClassType(theirs.id, type)).toEqual({ ok: false, message: "That class type doesn't exist." });
  });
});
