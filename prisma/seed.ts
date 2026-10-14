// Run with `npm run db:seed`.

import "dotenv/config";
import { db } from "../src/lib/db";

const CLIMBERS = [
  { firstName: "Tyler", lastName: "Le", phone: "+12505550101", email: "tyler.le@uvic.canada", dateOfBirth: "2003-08-15" },
  { firstName: "Agam", lastName: "Kamran", phone: "+12505550102", email: "agam.kamran@uvic.canada", dateOfBirth: "2003-04-12" },
  { firstName: "Ekam", lastName: "Gill", phone: "+12505550103", email: "ekam.gill@uvic.canada", dateOfBirth: "2002-11-21" },
  // Same last name + minor sharing parent/guardian's phone and email
  { firstName: "Nevin", lastName: "Gill", phone: "+12505550103", email: "ekam.gill@uvic.canada", dateOfBirth: "2015-01-17" },
  { firstName: "Scott", lastName: "Squires", phone: "+12505550104", email: "scott.squires@uvic.canada", dateOfBirth: "2001-08-30" },
  { firstName: "Zachary", lastName: "Zhao", phone: "+12505550105", email: "zachary.zhao@uvic.canada", dateOfBirth: "2003-06-02" },
  { firstName: "Seth", lastName: "Miller", phone: "+12505550106", email: null, dateOfBirth: "2002-12-05" },
  { firstName: "Khanh", lastName: "Truong", phone: "+12505550107", email: "khanh.truong@uvic.canada", dateOfBirth: "2003-02-28" },
  { firstName: "Jose", lastName: "Garcia", phone: "+12505550108", email: "jose.garcia@uvic.canada", dateOfBirth: "2001-09-14" },
  { firstName: "Zack", lastName: "Zhao", phone: "+12505550109", email: "zack.zhao@uvic.canada", dateOfBirth: "2008-07-23" },
];

async function main() {
  const gym = await db.gym.upsert({
    where: { slug: "boulderhouse-victoria" },
    update: { name: "BoulderHouse Climbing Victoria" },
    create: { name: "BoulderHouse Climbing Victoria", slug: "boulderhouse-victoria" },
  });

  await db.$transaction([
    db.climber.deleteMany({ where: { gymId: gym.id } }),
    db.climber.createMany({
      data: CLIMBERS.map((c) => ({
        ...c,
        gymId: gym.id,
        dateOfBirth: new Date(c.dateOfBirth),
      })),
    }),
  ]);

  console.log(`Seeded ${CLIMBERS.length} climbers into ${gym.name}.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });