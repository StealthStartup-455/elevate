# Database

Elevate's database holds everything the front desk needs to answer one question: **can this climber come in today?**

**Contents:** [How it works](#how-it-works) · [The tables](#the-tables) · [One gym, one set of data](#one-gym-one-set-of-data) · [Checking someone in](#checking-someone-in) · [Table reference](#table-reference) · [Code example](#code-example) · [Working with the database](#working-with-the-database)

## How it works

```
schema.prisma ──▶ migrations/ ──▶ Postgres ◀── server code
 (you edit)         (SQL)        (the data)   (src/lib/db.ts)
```

| Part | Where | What it does |
|---|---|---|
| **Schema** | `prisma/schema.prisma` | Describes the tables. The only file you edit to change the database. |
| **Migrations** | `prisma/migrations/` | The SQL Prisma writes from the schema when you run `npm run db:migrate`. Everyone runs the same ones, so everyone has the same database. |
| **Database** | Postgres, run by Supabase in Docker | Stores the data on your computer. |
| **Client** | `src/lib/db.ts` | Server code reads and writes through `db`. Pages and components never touch the database directly. |

## The tables

| Table | One row is | Example |
|---|---|---|
| `Gym` | A climbing gym | Granite Peak |
| `Staff` | A person who works at a gym | Sam, front desk |
| `Climber` | A customer of a gym | Kim Lee, age 12 |
| `Pass` | Something that lets a climber in | 10-visit punch card, 7 left |
| `Waiver` | A signed waiver | Version `v2`, signed by Kim's parent |
| `CheckIn` | One visit | Kim, 4:12 pm, QR scan |

```
Gym
 ├── Staff
 └── Climber
      ├── Pass
      ├── Waiver
      └── CheckIn ── Staff (who checked them in, optional)
```

A gym has staff and climbers. A climber has passes, waivers and check-ins. Staff are optional on a check-in (climbers can check themselves in) and on a climber (climbers can sign up online).

A few things to know:

- **Families can share** a phone number or email, so neither is unique. One parent's login can manage several kids.
- **Prices aren't stored.** The gym takes payment in its own system. A `Pass` only records what the climber has.
- **Nothing is deleted.** Staff who leave are set to `active = false`. Waivers are legal records, so a new signature is always a new row.

## One gym, one set of data

Every table except `Gym` has a `gymId`, and the database won't let a row from one gym point at a row from another.

That works because rows link to a climber or staff member using two columns together: the id **and** the `gymId`. A check-in at Gym B that points at a Gym A climber doesn't match anyone, so Postgres rejects it:

```
ERROR: insert or update on table "CheckIn" violates foreign key constraint "CheckIn_climberId_gymId_fkey"
```

The database also makes sure that:

- every gym's `slug` (used in `/join/granite-peak`) is unique
- one login can be staff at a gym only once
- a climber with passes, waivers or visits can't be deleted
- nobody can read the tables through Supabase's public API (Row Level Security is on for every table)

Everything else is checked in app code. **Always filter queries by `gymId`, and take it from the logged-in staff member, never from the URL or a form.**

## Checking someone in

1. **Find the climber** by QR code, phone or name, only within this gym.
2. **Check the waiver.** They need a `Waiver` whose `version` matches the gym's `waiverVersion`. If the gym has none set, any signed waiver counts.
3. **Check the pass.** They need a `Pass` that has started, hasn't expired, and has visits left if it's a punch card.
4. **Use a punch** if it's a punch card.
5. **Save a `CheckIn`.** Only allowed visits are saved.

The busyness page counts check-ins from the last 120 minutes.

## Table reference

Every table has an `id` (a UUID made by Prisma). Most also have `createdAt` and `updatedAt`, which fill themselves in.

### Gym

| Column | Type | Required | Notes |
|---|---|---|---|
| `name` | text | yes | |
| `slug` | text | yes, unique | Used in the sign-up link: `/join/granite-peak` |
| `timeZone` | text | yes | Default `America/Vancouver` |
| `system` | `GymSystem` | yes | Where passes and waivers really live: `ELEVATE` (default), `REDPOINT`, `ROCK_GYM_PRO` |
| `waiverVersion` | text | no | The waiver version climbers must have signed. Empty means any signed waiver counts |

### Staff

| Column | Type | Required | Notes |
|---|---|---|---|
| `gymId` | text | yes | |
| `authUserId` | text | yes | Their Supabase login. Unique per gym |
| `name` | text | yes | |
| `role` | `StaffRole` | yes | `DESK` (default), `MANAGER`, `OWNER` |
| `active` | boolean | yes | Set to `false` when they leave |

Email and password live in Supabase Auth, not here.

### Climber

| Column | Type | Required | Notes |
|---|---|---|---|
| `gymId` | text | yes | |
| `firstName`, `lastName` | text | yes | |
| `email` | text | no | Lowercase. Not unique |
| `phone` | text | no | Format `+12505551234`. Not unique |
| `dateOfBirth` | date | yes | |
| `authUserId` | text | no | The login that manages this climber |
| `createdByStaffId` | text | no | Who added them. Empty means they signed up themselves |
| `externalId` | text | no | Their id in Redpoint or Rock Gym Pro. Unique per gym |

Searchable by phone, email and last name within a gym.

### Pass

| Column | Type | Required | Notes |
|---|---|---|---|
| `gymId`, `climberId` | text | yes | |
| `kind` | `PassKind` | yes | `DAY`, `PUNCH`, `MEMBERSHIP` |
| `startsAt` | timestamp | yes | |
| `expiresAt` | timestamp | no | Empty means no end date |
| `visitsLeft` | integer | no | Punch cards only |
| `externalId` | text | no | Its id in the gym's own system. Unique per gym |

### Waiver

| Column | Type | Required | Notes |
|---|---|---|---|
| `gymId`, `climberId` | text | yes | |
| `version` | text | yes | Must match `Gym.waiverVersion` exactly |
| `signedAt` | timestamp | yes | Set automatically |
| `signedByName` | text | yes | |
| `signerRelation` | `SignerRelation` | yes | `SELF` (default), `PARENT`, `GUARDIAN` |
| `externalId` | text | no | Its id in Smartwaiver or similar. Unique per gym |

### CheckIn

| Column | Type | Required | Notes |
|---|---|---|---|
| `gymId`, `climberId` | text | yes | |
| `checkedInAt` | timestamp | yes | Set automatically |
| `method` | `CheckInMethod` | yes | `SELF`, `FRONT_DESK`, `QR` |
| `staffId` | text | no | Who checked them in |

Searchable by gym and time (busyness) and by climber and time (visit history).

The full SQL is in [`migrations/20261013220515_init/migration.sql`](migrations/20261013220515_init/migration.sql).

## Code example

The check-in steps above, in Prisma:

```ts
import { db } from "@/lib/db";
import type { Gym, Staff } from "@/generated/prisma/client";

// `staff` is the logged-in staff member, `gym` is their gym.
export async function checkIn(staff: Staff, gym: Gym, phone: string) {
  const climber = await db.climber.findFirst({
    where: { gymId: staff.gymId, phone },
  });
  if (!climber) return { ok: false, reason: "NOT_FOUND" };

  const waiver = await db.waiver.findFirst({
    where: {
      gymId: staff.gymId,
      climberId: climber.id,
      ...(gym.waiverVersion ? { version: gym.waiverVersion } : {}),
    },
  });
  if (!waiver) return { ok: false, reason: "NO_WAIVER" };

  const now = new Date();
  const pass = await db.pass.findFirst({
    where: {
      gymId: staff.gymId,
      climberId: climber.id,
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      AND: [{ OR: [{ visitsLeft: null }, { visitsLeft: { gt: 0 } }] }],
    },
  });
  if (!pass) return { ok: false, reason: "NO_PASS" };

  // `gt: 0` stops two desks using the last punch at the same time.
  if (pass.visitsLeft !== null) {
    const { count } = await db.pass.updateMany({
      where: { id: pass.id, visitsLeft: { gt: 0 } },
      data: { visitsLeft: { decrement: 1 } },
    });
    if (count === 0) return { ok: false, reason: "NO_VISITS_LEFT" };
  }

  const visit = await db.checkIn.create({
    data: { gymId: staff.gymId, climberId: climber.id, method: "FRONT_DESK", staffId: staff.id },
  });
  return { ok: true, visit };
}
```

The busyness count in SQL:

```sql
SELECT count(*)
FROM "CheckIn"
WHERE "gymId" = $1 AND "checkedInAt" > now() - interval '120 minutes';
```

Table and column names have capital letters, so raw SQL needs double quotes: `"Climber"`, `"gymId"`.

## Working with the database

### First-time setup

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and open it.
2. In the `elevate` folder, run:
   ```
   npm install
   cp .env.example .env
   npm run db:start
   npm run db:migrate
   ```
3. `db:start` prints a **publishable key**. Paste it into `.env` as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

### Commands

| Task | Command |
|---|---|
| Start the database (Docker Desktop must be open) | `npm run db:start` |
| Apply new migrations after a `git pull` | `npm run db:migrate` |
| Browse the tables in your browser | `npm run db:studio` |
| Load test data | `npm run db:seed` |
| Regenerate TypeScript types | `npx prisma generate` |
| Stop the database | `npm run db:stop` |

### Changing a table

1. Edit `prisma/schema.prisma`.
2. Run `npm run db:migrate -- --name short_description`.
3. Commit the schema and the new migration folder in the same PR.
4. Update this guide if a table or rule changed.

Never edit a migration after it's merged. Make a new one instead.

### Other files

| File | What it is |
|---|---|
| `prisma/seed.ts` | Test data for your local database |
| `prisma7.config.ts` | Tells Prisma where the schema, migrations and seed live |
| `src/generated/prisma/` | Types Prisma generates. Not committed |
| `supabase/config.toml` | Local Supabase settings |
