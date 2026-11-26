// The demo gym's calendar for seed.ts: opening hours, a special day, events,
// set changes and classes, with dates relative to today so the climber
// dashboard (/me) always has something coming up. All fictional.
//
// resetCalendar runs before seed.ts deletes the climbers (class bookings point
// at them); seedCalendar runs after it has made them again.

import { db } from "../src/lib/db";
import { addDays, gymClockAt, gymTime, weekdayOf } from "../src/features/events/time";

const hour = (h: number, m = 0) => h * 60 + m;

// Monday first. Later hours on weekdays, shorter weekends.
const WEEK = [
  { opensAt: hour(6), closesAt: hour(22) },
  { opensAt: hour(6), closesAt: hour(22) },
  { opensAt: hour(6), closesAt: hour(22) },
  { opensAt: hour(6), closesAt: hour(22) },
  { opensAt: hour(6), closesAt: hour(21) },
  { opensAt: hour(9), closesAt: hour(20) },
  { opensAt: hour(9), closesAt: hour(18) },
];

export async function resetCalendar(gymId: string): Promise<void> {
  const where = { where: { gymId } };
  // Shifts and bookings first: they reference classes, events, set changes and climbers.
  await db.staffShift.deleteMany(where);
  await db.classBooking.deleteMany(where);
  await db.gymClass.deleteMany(where);
  await db.classType.deleteMany(where);
  await db.gymEvent.deleteMany(where);
  await db.setChange.deleteMany(where);
  await db.specialHours.deleteMany(where);
  await db.openingHours.deleteMany(where);
}

export async function seedCalendar(gymId: string): Promise<void> {
  const gym = await db.gym.findUniqueOrThrow({ where: { id: gymId } });
  const today = gymClockAt(new Date(), gym.timeZone).day;
  // `minutes` after midnight, `days` from today, on the gym's clock.
  const at = (days: number, minutes: number) => gymTime(addDays(today, days), minutes, gym.timeZone);

  await db.openingHours.createMany({
    data: WEEK.map((h, weekday) => ({ gymId, weekday, closed: false, ...h })),
  });
  // A closed day in the week ahead, so the dashboard shows one. Then more special days, past and
  // ahead, so the desk calendar (#249) has some to show.
  const date = (days: number) => new Date(`${addDays(today, days)}T00:00:00Z`);
  await db.specialHours.createMany({
    data: [
      { gymId, date: date(4), closed: true, note: "Staff training day" },
      { gymId, date: date(-8), closed: true, note: "Deep clean" },
      { gymId, date: date(15), closed: false, opensAt: hour(10), closesAt: hour(16), note: "Short day for the holiday" },
      { gymId, date: date(29), closed: false, opensAt: hour(12), closesAt: hour(22), note: "Late start after the comp" },
    ],
  });

  const events = await db.gymEvent.createManyAndReturn({
    select: { id: true, title: true, startsAt: true, endsAt: true, canceledAt: true },
    data: [
      {
        gymId,
        title: "Fall Send Fest bouldering comp",
        details: "Open to every level. Qualifiers in the morning, finals at 4 PM. Sign up at the front desk.",
        startsAt: at(12, hour(10)),
        endsAt: at(12, hour(18)),
      },
      {
        gymId,
        title: "Climbing film night",
        details: "Short films on the big screen by the bouldering cave. Free popcorn.",
        startsAt: at(5, hour(19)),
        endsAt: at(5, hour(21)),
      },
      // More for the desk calendar (#249). Nothing else starts before the film night or runs
      // through today, so it stays the climber's Home banner.
      {
        gymId,
        title: "Costume climb night",
        details: "Climb in costume. Best costume wins a free month.",
        startsAt: at(-24, hour(18)),
        endsAt: at(-24, hour(22)),
      },
      {
        gymId,
        title: "Women's climbing night",
        details: "Meet other climbers, try new problems and get tips from our coaches.",
        startsAt: at(-11, hour(18, 30)),
        endsAt: at(-11, hour(21)),
      },
      {
        gymId,
        title: "Outdoor crag day trip",
        details: "A day climbing outside with our coaches. Canceled because of the weather forecast.",
        startsAt: at(9, hour(8)),
        endsAt: at(9, hour(17)),
        canceledAt: new Date(),
      },
      {
        gymId,
        title: "Winter bouldering league",
        details: "Five days of league problems. Log your sends at the front desk.",
        startsAt: at(18, hour(12)),
        endsAt: at(22, hour(21)),
      },
      {
        gymId,
        title: "Member appreciation night",
        details: "Snacks, music and a gear swap for members.",
        startsAt: at(26, hour(18)),
        endsAt: at(26, hour(21)),
      },
    ],
  });

  const setChanges = await db.setChange.createManyAndReturn({
    select: { id: true, startsAt: true, endsAt: true },
    data: [
      { gymId, wall: "Cave", startsAt: at(2, hour(9)), endsAt: at(2, hour(14)), note: "New circuit, V0 to V6." },
      { gymId, wall: "Slab", startsAt: at(-5, hour(9)), endsAt: at(-5, hour(15)), note: "Fresh slab problems for every level." },
      { gymId, wall: "Kids' wall", startsAt: at(-9, hour(8)), endsAt: at(-9, hour(12)), note: null },
      { gymId, wall: "Lead wall", startsAt: at(-19, hour(9)), endsAt: at(-19, hour(16)), note: "New lead routes, 5.8 to 5.12." },
      { gymId, wall: "Comp wall", startsAt: at(16, hour(9)), endsAt: at(17, hour(15)), note: "Reset for the winter league." },
      { gymId, wall: "Top rope wall", startsAt: at(25, hour(8)), endsAt: at(25, hour(13)), note: null },
    ],
  });

  // The kinds of class the gym runs, then sessions of them, each a copy of its type.
  const TYPES = {
    intro: { name: "Intro to bouldering", details: "Never climbed before? Learn the basics and how to fall safely. Shoes included.", instructor: "Sam", durationMinutes: 60, capacity: 8 },
    footwork: { name: "Technique clinic: footwork", details: "Quiet feet, smearing and heel hooks.", instructor: "Priya", durationMinutes: 90, capacity: 6 },
    yoga: { name: "Yoga for climbers", details: "Stretch out shoulders, hips and forearms.", instructor: "Jordan", durationMinutes: 60, capacity: 12 },
    youth: { name: "Youth climbing club", details: "Ages 8 to 14. Games, technique and a lot of climbing.", instructor: "Priya", durationMinutes: 90, capacity: 10 },
    belay: { name: "Learn to belay", details: "Tie in, belay and lower safely. Ends with the belay test.", instructor: "Alex", durationMinutes: 90, capacity: 6 },
    lead: { name: "Lead climbing course", details: "Clipping, falling and catching falls. You need to pass the belay test first.", instructor: "Morgan", durationMinutes: 120, capacity: 4 },
  };
  const typeIds: Record<string, string> = {};
  for (const [key, t] of Object.entries(TYPES)) {
    typeIds[key] = (await db.classType.create({ data: { gymId, ...t }, select: { id: true } })).id;
  }

  const classes: { type: keyof typeof TYPES; startsAt: Date; booked: number; agam?: boolean; canceled?: boolean }[] = [
    // The e2e tests count on these five: keep them first and as they are.
    { type: "intro", startsAt: at(1, hour(18)), booked: 3 },
    { type: "footwork", startsAt: at(3, hour(19)), booked: 6 },
    { type: "yoga", startsAt: at(6, hour(9, 30)), booked: 2, agam: true },
    { type: "intro", startsAt: at(8, hour(18)), booked: 0 },
    { type: "youth", startsAt: at(10, hour(16, 30)), booked: 4 },
    // More for the desk calendar (#249): past sessions with who came, and more ahead. None on
    // days 1, 4 or 6, and no second footwork or youth class in the next two weeks (the tests).
    { type: "intro", startsAt: at(-20, hour(18)), booked: 5 },
    { type: "footwork", startsAt: at(-17, hour(19)), booked: 6 },
    { type: "intro", startsAt: at(-13, hour(18)), booked: 8 },
    { type: "youth", startsAt: at(-11, hour(16, 30)), booked: 9 },
    { type: "belay", startsAt: at(-8, hour(18)), booked: 4 },
    { type: "intro", startsAt: at(-6, hour(18)), booked: 4 },
    { type: "youth", startsAt: at(-4, hour(16, 30)), booked: 7 },
    { type: "yoga", startsAt: at(-3, hour(9, 30)), booked: 6 },
    { type: "lead", startsAt: at(-2, hour(19)), booked: 3 },
    { type: "belay", startsAt: at(2, hour(18)), booked: 3 },
    { type: "lead", startsAt: at(7, hour(19)), booked: 4 },
    { type: "belay", startsAt: at(11, hour(18)), booked: 2, canceled: true },
    { type: "yoga", startsAt: at(13, hour(9, 30)), booked: 5 },
    { type: "intro", startsAt: at(13, hour(18)), booked: 1 },
    { type: "footwork", startsAt: at(17, hour(19)), booked: 2 },
    { type: "youth", startsAt: at(17, hour(16, 30)), booked: 3 },
    { type: "yoga", startsAt: at(20, hour(9, 30)), booked: 4 },
    { type: "intro", startsAt: at(22, hour(18)), booked: 2 },
    { type: "youth", startsAt: at(24, hour(16, 30)), booked: 1 },
    { type: "lead", startsAt: at(28, hour(19)), booked: 1 },
    { type: "belay", startsAt: at(30, hour(18)), booked: 0 },
  ];

  // Busyness climbers fill the places, never the demo accounts the e2e tests
  // sign in as. Agam Kamran is signed up for one class, to show how it looks.
  const fillers = await db.climber.findMany({
    where: { gymId, externalId: { startsWith: "climber-" } },
    orderBy: { externalId: "asc" },
    select: { id: true },
  });
  const agam = await db.climber.findFirst({ where: { gymId, firstName: "Agam", lastName: "Kamran" }, select: { id: true } });

  let next = 0;
  const made: { id: string; instructor: string; startsAt: Date; durationMinutes: number; canceled: boolean }[] = [];
  for (const { type, startsAt, booked, agam: withAgam, canceled } of classes) {
    const { name: title, ...copied } = TYPES[type];
    const created = await db.gymClass.create({
      data: { gymId, classTypeId: typeIds[type], title, startsAt, ...copied, canceledAt: canceled ? new Date() : null },
      select: { id: true },
    });
    made.push({ id: created.id, instructor: copied.instructor, startsAt, durationMinutes: copied.durationMinutes, canceled: !!canceled });
    // Round the list of fillers, so later classes still fill when it runs out.
    const climberIds = fillers.length
      ? [...new Set(Array.from({ length: booked }, (_, i) => fillers[(next + i) % fillers.length].id))]
      : [];
    next += booked;
    if (withAgam && agam) climberIds.push(agam.id);
    await db.classBooking.createMany({
      data: climberIds.map((climberId) => ({ gymId, classId: created.id, climberId })),
    });
  }

  const shiftCount = await seedShifts(gymId, gym.timeZone, today, { made, events, setChanges, closedDays: [4, -8] });

  console.log(
    `Seeded the calendar: ${shiftCount} staff shifts, opening hours, 4 special days, 7 events, 6 set changes, ${Object.keys(TYPES).length} class types and ${classes.length} classes.`,
  );
}

// Staff and who works when (#249), for the desk calendar's "Who's working". Demo staff have no
// login: their authUserId is a made-up "demo-staff-..." that no Supabase user has.
const STAFF = ["Sam", "Priya", "Jordan", "Alex", "Morgan", "Riley", "Casey", "Taylor"] as const;
type StaffName = (typeof STAFF)[number];

async function seedShifts(
  gymId: string,
  timeZone: string,
  today: string,
  things: {
    made: { id: string; instructor: string; startsAt: Date; durationMinutes: number; canceled: boolean }[];
    events: { id: string; startsAt: Date; endsAt: Date | null; canceledAt: Date | null }[];
    setChanges: { id: string; startsAt: Date; endsAt: Date }[];
    /** Days from today the gym is closed: no desk shifts. */
    closedDays: number[];
  },
): Promise<number> {
  const staffIds = {} as Record<StaffName, string>;
  for (const name of STAFF) {
    const authUserId = `demo-staff-${name.toLowerCase()}`;
    staffIds[name] = (
      await db.staff.upsert({
        where: { gymId_authUserId: { gymId, authUserId } },
        update: { name, active: true },
        create: { gymId, authUserId, name },
        select: { id: true },
      })
    ).id;
  }
  const at = (days: number, minutes: number) => gymTime(addDays(today, days), minutes, timeZone);
  const minutesLater = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000);
  type Shift = {
    staffId: string;
    kind: "DESK" | "COACHING" | "CLASS" | "SETTING" | "EVENT";
    startsAt: Date;
    endsAt: Date;
    classId?: string;
    eventId?: string;
    setChangeId?: string;
    note?: string;
    canceledAt?: Date;
  };
  const shifts: Shift[] = [];

  // The front desk: an opening and a closing shift every open day, three weeks back to a month ahead.
  for (let days = -21; days <= 30; days++) {
    if (things.closedDays.includes(days)) continue;
    const { opensAt, closesAt } = WEEK[weekdayOf(addDays(today, days))];
    const change = opensAt + Math.round((closesAt - opensAt) / 2 / 60) * 60;
    shifts.push(
      { staffId: staffIds.Riley, kind: "DESK", startsAt: at(days, opensAt), endsAt: at(days, change), note: "Opening" },
      { staffId: staffIds.Casey, kind: "DESK", startsAt: at(days, change), endsAt: at(days, closesAt), note: "Closing" },
    );
    // Youth team coaching on Tuesdays and Thursdays.
    const weekday = weekdayOf(addDays(today, days));
    if (weekday === 1 || weekday === 3) {
      shifts.push({ staffId: staffIds.Priya, kind: "COACHING", startsAt: at(days, hour(16)), endsAt: at(days, hour(18)), note: "Youth team practice" });
    }
  }

  // Whoever teaches each class; a canceled class's shift is canceled with it.
  for (const c of things.made) {
    const staffId = staffIds[c.instructor as StaffName];
    if (!staffId) continue;
    shifts.push({
      staffId,
      kind: "CLASS",
      startsAt: c.startsAt,
      endsAt: minutesLater(c.startsAt, c.durationMinutes),
      classId: c.id,
      canceledAt: c.canceled ? new Date() : undefined,
    });
  }

  // Two people on each event, for its first day.
  for (const e of things.events) {
    const end = e.endsAt && e.endsAt.getTime() - e.startsAt.getTime() <= 12 * 60 * 60_000 ? e.endsAt : minutesLater(e.startsAt, 4 * 60);
    for (const name of ["Jordan", "Alex"] as const) {
      shifts.push({
        staffId: staffIds[name],
        kind: "EVENT",
        startsAt: e.startsAt,
        endsAt: end,
        eventId: e.id,
        canceledAt: e.canceledAt ?? undefined,
      });
    }
  }

  // Taylor sets every wall, on its first day.
  for (const sc of things.setChanges) {
    const end = sc.endsAt.getTime() - sc.startsAt.getTime() <= 12 * 60 * 60_000 ? sc.endsAt : minutesLater(sc.startsAt, 8 * 60);
    shifts.push({ staffId: staffIds.Taylor, kind: "SETTING", startsAt: sc.startsAt, endsAt: end, setChangeId: sc.id });
  }

  await db.staffShift.createMany({ data: shifts.map((s) => ({ gymId, ...s })) });
  return shifts.length;
}
