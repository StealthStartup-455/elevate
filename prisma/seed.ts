// Run with `npm run db:seed`. Safe to run again: it resets the demo gym.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

async function main() {
  const gym = await db.gym.upsert({
    where: { slug: "demo-gym" },
    update: {},
    create: { name: "Demo Climbing Gym", slug: "demo-gym" },
  });

  // Start from a clean slate for this gym (check-ins and codes cascade).
  await db.climber.deleteMany({ where: { gymId: gym.id } });
  await db.staff.deleteMany({ where: { gymId: gym.id } });

  const desk = await db.staff.create({
    data: {
      gymId: gym.id,
      // Placeholder until this person has a real Supabase Auth login.
      authUserId: "00000000-0000-0000-0000-000000000001",
      name: "Sam Desk",
      email: "desk@demo-gym.test",
      role: "DESK",
    },
  });

  const climbers = await Promise.all(
    [
      {
        firstName: "Alex",
        lastName: "Honnold",
        email: "alex@example.com",
        phone: "+12505550101",
        dateOfBirth: new Date("1990-08-17"),
        signupSource: "SELF_SIGNUP" as const,
      },
      {
        firstName: "Priya",
        lastName: "Shah",
        email: "priya@example.com",
        phone: null,
        dateOfBirth: new Date("1998-03-02"),
        signupSource: "SELF_SIGNUP" as const,
      },
      {
        firstName: "Marcus",
        lastName: "Lee",
        email: null,
        phone: "+12505550103",
        dateOfBirth: new Date("1985-11-23"),
        signupSource: "FRONT_DESK" as const,
        createdByStaffId: desk.id,
      },
      {
        // Under 18, so a guardian's consent is recorded.
        firstName: "Maya",
        lastName: "Chen",
        email: null,
        phone: "+12505550104",
        dateOfBirth: new Date("2012-06-30"),
        guardianName: "Lin Chen",
        guardianPhone: "+12505550199",
        guardianConsentAt: minutesAgo(60 * 24 * 7),
        signupSource: "FRONT_DESK" as const,
        createdByStaffId: desk.id,
      },
      {
        firstName: "Jordan",
        lastName: "Rivera",
        email: "jordan@example.com",
        phone: "+12505550105",
        dateOfBirth: new Date("2001-01-15"),
        signupSource: "SELF_SIGNUP" as const,
      },
    ].map((c) => db.climber.create({ data: { gymId: gym.id, ...c } })),
  );

  const [alex, priya, marcus, maya] = climbers;
  await db.checkIn.createMany({
    data: [
      { gymId: gym.id, climberId: alex.id, method: "PIN", timestamp: minutesAgo(20) },
      { gymId: gym.id, climberId: priya.id, method: "QR", timestamp: minutesAgo(45) },
      {
        gymId: gym.id,
        climberId: marcus.id,
        method: "FRONT_DESK",
        staffId: desk.id,
        timestamp: minutesAgo(90),
      },
      {
        gymId: gym.id,
        climberId: maya.id,
        method: "FRONT_DESK",
        staffId: desk.id,
        timestamp: minutesAgo(60 * 26),
      },
    ],
  });

  console.log(`Seeded ${gym.name}: 1 staff, ${climbers.length} climbers, 4 check-ins.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
