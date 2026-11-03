// The demo gym's calendar for seed.ts: opening hours, a special day, events,
// set changes and classes, with dates relative to today so the climber
// dashboard (/me) always has something coming up. All fictional.
//
// resetCalendar runs before seed.ts deletes the climbers (class bookings point
// at them); seedCalendar runs after it has made them again.

import { db } from "../src/lib/db";
import { addDays, gymClockAt, gymTime } from "../src/features/events/time";

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
  // Bookings first: they reference classes and climbers.
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
  // A closed day in the week ahead, so the dashboard shows one.
  await db.specialHours.create({
    data: { gymId, date: new Date(`${addDays(today, 4)}T00:00:00Z`), closed: true, note: "Staff training day" },
  });

  await db.gymEvent.createMany({
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
    ],
  });

  await db.setChange.createMany({
    data: [
      { gymId, wall: "Cave", startsAt: at(2, hour(9)), endsAt: at(2, hour(14)), note: "New circuit, V0 to V6." },
      { gymId, wall: "Slab", startsAt: at(-5, hour(9)), endsAt: at(-5, hour(15)), note: "Fresh slab problems for every level." },
      { gymId, wall: "Kids' wall", startsAt: at(-9, hour(8)), endsAt: at(-9, hour(12)), note: null },
    ],
  });

  // The kinds of class the gym runs, then sessions of them, each a copy of its type.
  const TYPES = {
    intro: { name: "Intro to bouldering", details: "Never climbed before? Learn the basics and how to fall safely. Shoes included.", instructor: "Sam", durationMinutes: 60, capacity: 8 },
    footwork: { name: "Technique clinic: footwork", details: "Quiet feet, smearing and heel hooks.", instructor: "Priya", durationMinutes: 90, capacity: 6 },
    yoga: { name: "Yoga for climbers", details: "Stretch out shoulders, hips and forearms.", instructor: "Jordan", durationMinutes: 60, capacity: 12 },
    youth: { name: "Youth climbing club", details: "Ages 8 to 14. Games, technique and a lot of climbing.", instructor: "Priya", durationMinutes: 90, capacity: 10 },
  };
  const typeIds: Record<string, string> = {};
  for (const [key, t] of Object.entries(TYPES)) {
    typeIds[key] = (await db.classType.create({ data: { gymId, ...t }, select: { id: true } })).id;
  }

  const classes: { type: keyof typeof TYPES; startsAt: Date; booked: number; agam?: boolean }[] = [
    { type: "intro", startsAt: at(1, hour(18)), booked: 3 },
    { type: "footwork", startsAt: at(3, hour(19)), booked: 6 },
    { type: "yoga", startsAt: at(6, hour(9, 30)), booked: 2, agam: true },
    { type: "intro", startsAt: at(8, hour(18)), booked: 0 },
    { type: "youth", startsAt: at(10, hour(16, 30)), booked: 4 },
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
  for (const { type, startsAt, booked, agam: withAgam } of classes) {
    const { name: title, ...copied } = TYPES[type];
    const created = await db.gymClass.create({
      data: { gymId, classTypeId: typeIds[type], title, startsAt, ...copied },
      select: { id: true },
    });
    const climberIds = fillers.slice(next, next + booked).map((c) => c.id);
    next += booked;
    if (withAgam && agam) climberIds.push(agam.id);
    await db.classBooking.createMany({
      data: climberIds.map((climberId) => ({ gymId, classId: created.id, climberId })),
    });
  }

  console.log(
    `Seeded the calendar: opening hours, 1 special day, 2 events, 3 set changes, ${Object.keys(TYPES).length} class types and ${classes.length} classes.`,
  );
}
