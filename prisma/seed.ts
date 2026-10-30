// Run with `npm run db:seed`. Safe to run again: it resets the demo gym's
// climbers, waivers, passes and check-ins, so climbers added in the app are
// removed.
//
// What it creates:
// - the demo gym, its waiver wording (version v1, placeholder text), and what
//   its desk sells on the POS tab (PRODUCTS below)
// - the team's own climbers (CLIMBERS below)
// - the climbers the busyness mock check-ins refer to (src/features/analytics/mock),
//   saved with the mock's id (climber-12) as externalId so the desk can link
//   a check-in to the real climber
// - one demo account for every waiver and membership state, which log in with
//   their username as the password (src/features/climbers/demo-accounts.ts)
// - two real Supabase logins, desk@elevate.test and climber@elevate.test, if
//   the keys are set (seed-logins.ts)

import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_GYM_SLUG } from "../src/lib/gym";
import { db } from "../src/lib/db";
import { DEMO_ACCOUNTS } from "../src/features/climbers/demo-accounts";
import { hashWaiver } from "../src/features/waivers/hash";
import { SAMPLE_WAIVER } from "../src/features/waivers/sample-waiver";
import { toStoredPhone } from "../src/features/climbers/phone";
import { seedLogins } from "./seed-logins";
import type { Prisma } from "../src/generated/prisma/client";
import type {
  MembershipStatus,
  WaiverStatus,
} from "../src/features/climbers/types";

// Fictional on purpose: the repo is public, so no real gym's name (#67).
const SEED_GYM_NAME = "Elevate Demo Gym";

type SeedClimber = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  dateOfBirth: string;
  externalId?: string;
  waiver: WaiverStatus;
  membership: MembershipStatus;
  // Monthly recurring member whose month ends in this many days, so the POS
  // shows them under "Renewals due".
  renewsInDays?: number;
};

// Same people as before, now with a waiver and membership each so every
// state shows up on the desk list.
const CLIMBERS: SeedClimber[] = [
  { firstName: "Tyler", lastName: "Le", phone: "+12505550101", email: "tyler.le@uvic.canada", dateOfBirth: "2003-08-15", waiver: "valid", membership: "active" },
  { firstName: "Agam", lastName: "Kamran", phone: "+12505550102", email: "agam.kamran@uvic.canada", dateOfBirth: "2003-04-12", waiver: "valid", membership: "active", renewsInDays: 3 },
  { firstName: "Ekam", lastName: "Gill", phone: "+12505550103", email: "ekam.gill@uvic.canada", dateOfBirth: "2002-11-21", waiver: "valid", membership: "active" },
  // Same last name + minor sharing parent/guardian's phone and email
  { firstName: "Nevin", lastName: "Gill", phone: "+12505550103", email: "ekam.gill@uvic.canada", dateOfBirth: "2015-01-17", waiver: "valid", membership: "none" },
  { firstName: "Scott", lastName: "Squires", phone: "+12505550104", email: "scott.squires@uvic.canada", dateOfBirth: "2001-08-30", waiver: "valid", membership: "active" },
  { firstName: "Zachary", lastName: "Zhao", phone: "+12505550105", email: "zachary.zhao@uvic.canada", dateOfBirth: "2003-06-02", waiver: "valid", membership: "active" },
  { firstName: "Seth", lastName: "Miller", phone: "+12505550106", email: null, dateOfBirth: "2002-12-05", waiver: "missing", membership: "none" },
  { firstName: "Khanh", lastName: "Truong", phone: "+12505550107", email: "khanh.truong@uvic.canada", dateOfBirth: "2003-02-28", waiver: "valid", membership: "paused" },
  { firstName: "Jose", lastName: "Garcia", phone: "+12505550108", email: "jose.garcia@uvic.canada", dateOfBirth: "2001-09-14", waiver: "valid", membership: "expired" },
  { firstName: "Zack", lastName: "Zhao", phone: "+12505550109", email: "zack.zhao@uvic.canada", dateOfBirth: "2008-07-23", waiver: "expired", membership: "active" },
  // No active membership, for trying the POS: someone to sell a day pass,
  // punch card or membership to.
  { firstName: "Maya", lastName: "Patel", phone: "+12505550110", email: "maya.patel@example.test", dateOfBirth: "1998-03-09", waiver: "valid", membership: "none" },
  { firstName: "Liam", lastName: "Chen", phone: "+12505550111", email: "liam.chen@example.test", dateOfBirth: "2004-10-27", waiver: "valid", membership: "none" },
  { firstName: "Sofia", lastName: "Rossi", phone: "+12505550112", email: "sofia.rossi@example.test", dateOfBirth: "1995-07-18", waiver: "valid", membership: "expired" },
  { firstName: "Noah", lastName: "Fraser", phone: "+12505550113", email: null, dateOfBirth: "1989-12-02", waiver: "valid", membership: "expired" },
  { firstName: "Ava", lastName: "Thompson", phone: "+12505550114", email: "ava.thompson@example.test", dateOfBirth: "2000-05-30", waiver: "missing", membership: "none" },
  { firstName: "Ethan", lastName: "Brooks", phone: "+12505550115", email: "ethan.brooks@example.test", dateOfBirth: "1993-01-14", waiver: "expired", membership: "expired" },
  { firstName: "Chloe", lastName: "Nguyen", phone: "+12505550116", email: "chloe.nguyen@example.test", dateOfBirth: "1997-09-05", waiver: "valid", membership: "paused" },
];

// What the desk sells on the POS tab. Rough mock prices in cents, before
// tax, roughly what climbing gyms around Victoria charge. Not real prices.
// Rentals and chalk pay BC PST as well as GST; passes and memberships are
// GST only.
const PRODUCTS: Omit<Prisma.ProductCreateManyInput, "gymId">[] = [
  { name: "Day pass", kind: "DAY", priceCents: 2500 },
  { name: "10-punch card", kind: "PUNCH", priceCents: 20000, punches: 10 },
  { name: "1 month membership", kind: "MEMBERSHIP", priceCents: 10000, durationMonths: 1 },
  { name: "3 month membership", kind: "MEMBERSHIP", priceCents: 27000, durationMonths: 3 },
  { name: "Monthly recurring membership", kind: "MEMBERSHIP", priceCents: 8500, durationMonths: 1, recurring: true },
  { name: "Annual membership", kind: "MEMBERSHIP", priceCents: 90000, durationMonths: 12 },
  { name: "Student membership (1 month)", kind: "MEMBERSHIP", priceCents: 7500, durationMonths: 1 },
  { name: "Shoe rental", kind: "RENTAL", priceCents: 600, chargesPst: true },
  { name: "Harness rental", kind: "RENTAL", priceCents: 500, chargesPst: true },
  { name: "Chalk", kind: "RETAIL", priceCents: 800, chargesPst: true },
];

type BusynessMockClimber = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  waiverStatus: WaiverStatus;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function numberOf(id: string): number {
  return Number(id.replace(/\D/g, "")) || 0;
}

// Made up from the id, so the same climber always gets the same date.
function dateOfBirthFor(n: number): string {
  // Every 9th climber is a child, so the under-18 case is visible.
  const year = n % 9 === 0 ? 2012 + (n % 4) : 1965 + ((n * 7) % 40);
  return `${year}-${pad(((n * 5) % 12) + 1)}-${pad(((n * 11) % 28) + 1)}`;
}

// Most are active, every 7th is paused, every 10th expired, so each state of
// the dashboard can be seen.
function membershipFor(n: number): MembershipStatus {
  if (n % 10 === 4) return "expired";
  if (n % 10 === 7) return "paused";
  return "active";
}

// The busyness scenarios share ids; the busiest one has every climber.
function busynessClimbers(): SeedClimber[] {
  const dir = join(process.cwd(), "src/features/analytics/mock");
  const byId = new Map<string, BusynessMockClimber>();
  for (const scenario of ["quiet", "moderate", "busy"]) {
    const data = JSON.parse(readFileSync(join(dir, `${scenario}.json`), "utf8"));
    for (const c of data.climbers as BusynessMockClimber[]) byId.set(c.id, c);
  }
  return [...byId.values()].map((c) => {
    const n = numberOf(c.id);
    return {
      firstName: c.firstName,
      lastName: c.lastName,
      phone: toStoredPhone(c.phone),
      email: null,
      dateOfBirth: dateOfBirthFor(n),
      externalId: c.id,
      waiver: c.waiverStatus,
      membership: membershipFor(n),
    };
  });
}

function demoClimbers(): SeedClimber[] {
  return DEMO_ACCOUNTS.map((d, i) => ({
    firstName: "Demo",
    lastName: `${d.waiverStatus[0].toUpperCase()}${d.waiverStatus.slice(1)}-${d.membershipStatus[0].toUpperCase()}${d.membershipStatus.slice(1)}`,
    phone: toStoredPhone(`250-555-${9001 + i}`),
    email: null,
    dateOfBirth: "1990-06-15",
    // The username is the login, and how the app tells demo accounts apart.
    externalId: d.username,
    waiver: d.waiverStatus,
    membership: d.membershipStatus,
  }));
}

// The waiver version climbers must sign. The seeded waivers below are this
// version, so their status doesn't change.
const WAIVER_VERSION = "v1";

const DAY = 24 * 60 * 60 * 1000;

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * DAY);
}

// A valid waiver was signed within the last year; an expired one over a year ago.
function waiversFor(c: SeedClimber, gymId: string, n: number) {
  if (c.waiver === "missing") return [];
  const ago = c.waiver === "valid" ? 30 + (n % 200) : 400 + (n % 100);
  return [
    {
      gymId,
      version: WAIVER_VERSION,
      signedAt: daysFromNow(-ago),
      signedByName: `${c.firstName} ${c.lastName}`,
    },
  ];
}

// A membership is a Pass of kind MEMBERSHIP that ends on the renewal date.
function passesFor(c: SeedClimber, gymId: string, n: number) {
  const base = { gymId, kind: "MEMBERSHIP" as const };
  switch (c.membership) {
    case "none":
      return [];
    case "active":
      if (c.renewsInDays !== undefined) {
        return [
          { ...base, startsAt: daysFromNow(c.renewsInDays - 30), expiresAt: daysFromNow(c.renewsInDays), renews: true },
        ];
      }
      return [{ ...base, startsAt: daysFromNow(-40), expiresAt: daysFromNow(10 + (n % 20)) }];
    case "paused":
      return [
        {
          ...base,
          startsAt: daysFromNow(-60),
          expiresAt: daysFromNow(20),
          pausedAt: daysFromNow(-5),
        },
      ];
    case "expired":
      return [{ ...base, startsAt: daysFromNow(-120), expiresAt: daysFromNow(-(15 + (n % 30))) }];
  }
}

async function main() {
  const gym = await db.gym.upsert({
    where: { slug: DEFAULT_GYM_SLUG },
    update: { name: SEED_GYM_NAME, waiverVersion: WAIVER_VERSION },
    create: { name: SEED_GYM_NAME, slug: DEFAULT_GYM_SLUG, waiverVersion: WAIVER_VERSION },
  });

  // Published wording is never edited, so an existing v1 is left as it is.
  await db.waiverTemplate.upsert({
    where: { gymId_version: { gymId: gym.id, version: WAIVER_VERSION } },
    update: {},
    create: {
      gymId: gym.id,
      version: WAIVER_VERSION,
      ...SAMPLE_WAIVER,
      bodyHash: hashWaiver(SAMPLE_WAIVER),
    },
  });

  const all: SeedClimber[] = [...CLIMBERS, ...busynessClimbers(), ...demoClimbers()];

  await db.$transaction(
    async (tx) => {
      // Children first: they reference climbers with ON DELETE RESTRICT.
      await tx.qrScan.deleteMany({ where: { gymId: gym.id } });
      await tx.checkIn.deleteMany({ where: { gymId: gym.id } });
      await tx.waiver.deleteMany({ where: { gymId: gym.id } });
      await tx.pass.deleteMany({ where: { gymId: gym.id } });
      await tx.saleLine.deleteMany({ where: { gymId: gym.id } });
      await tx.sale.deleteMany({ where: { gymId: gym.id } });
      await tx.climber.deleteMany({ where: { gymId: gym.id } });

      // Products keep their ids across seeds; a product no longer listed
      // here is switched off, never deleted.
      await tx.product.updateMany({
        where: { gymId: gym.id, name: { notIn: PRODUCTS.map((p) => p.name) } },
        data: { active: false },
      });
      for (const [i, p] of PRODUCTS.entries()) {
        const data = { ...p, gymId: gym.id, sortOrder: i, active: true };
        await tx.product.upsert({
          where: { gymId_name: { gymId: gym.id, name: p.name } },
          update: data,
          create: data,
        });
      }

      const waivers = [];
      const passes = [];
      for (const [i, c] of all.entries()) {
        const n = c.externalId ? numberOf(c.externalId) || i + 1 : i + 1;
        const climber = await tx.climber.create({
          data: {
            gymId: gym.id,
            firstName: c.firstName,
            lastName: c.lastName,
            phone: c.phone,
            email: c.email,
            dateOfBirth: new Date(`${c.dateOfBirth}T00:00:00Z`),
            externalId: c.externalId ?? null,
          },
          select: { id: true },
        });
        for (const w of waiversFor(c, gym.id, n)) waivers.push({ ...w, climberId: climber.id });
        for (const p of passesFor(c, gym.id, n)) passes.push({ ...p, climberId: climber.id });
      }
      await tx.waiver.createMany({ data: waivers });
      await tx.pass.createMany({ data: passes });
    },
    { timeout: 60_000 },
  );

  console.log(
    `Seeded ${all.length} climbers into ${gym.name} ` +
      `(${CLIMBERS.length} team, ${all.length - CLIMBERS.length - DEMO_ACCOUNTS.length} busyness, ${DEMO_ACCOUNTS.length} demo), ` +
      `and ${PRODUCTS.length} products for the POS.`,
  );

  await seedLogins(gym.id);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
