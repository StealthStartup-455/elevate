# Database

All of this exists so the front desk can answer one thing fast: **can this person climb today?**

## How it works

You only ever edit `schema.prisma`. Run `npm run db:migrate` and Prisma writes the change as SQL into `migrations/` and applies it to your local Postgres (Supabase, running in Docker). Commit the migration with the schema change so everyone else gets the same tables.

Server code reads and writes through `db` in `src/lib/db.ts`. Pages don't query the database directly.

## The tables

| Table | One row is | Example |
|---|---|---|
| `Gym` | A gym | Elevate Demo Gym |
| `Staff` | Someone who works the desk | Sam, closing shift |
| `Climber` | A customer | Kim Lee, 12, youth team |
| `Pass` | Whatever gets them in | 10-punch card, 7 left |
| `WaiverTemplate` | One version of a gym's waiver wording | `v2`, published 1 March |
| `Waiver` | One signed waiver | `v2`, signed by Kim's dad |
| `CheckIn` | One visit | Kim, 4:12 pm, scanned QR |
| `QrScan` | A QR scan waiting for the desk | Kim tapped scan at 4:11 pm |

```text
Gym
 ├── Staff
 ├── WaiverTemplate
 └── Climber
      ├── Pass
      ├── Waiver ── WaiverTemplate
      ├── CheckIn ── Staff
      └── QrScan
```

### Intentional design choices

- Phone and email are not unique. Families often share one, so a phone search can return several climbers. One login can also manage several climbers.
- Prices are not stored. Payments happen in the gym's own POS; a `Pass` only records what the climber has.
- Rows are never deleted. Staff who leave are set to `active = false`. Waivers are legal records, so re-signing creates a new row. Waiver wording is never edited either: a new wording is a new `WaiverTemplate` row.

## Gym isolation

All gyms share the same tables. The `gymId` column on every table except `Gym` is what separates them.

**Filter every query by `gymId`, and take it from the logged-in staff member, not from the URL or form input.** Otherwise one gym can read another gym's members.

The database blocks cross-gym writes. Rows reference a climber or staff member by `id` and `gymId` together, so a check-in can't point at another gym's climber:

```text
ERROR: insert or update on table "CheckIn" violates foreign key constraint "CheckIn_climberId_gymId_fkey"
```

It does not protect reads. A query without a `gymId` filter returns every gym's data.

## Database constraints

- Gym slugs are unique. The slug is used in the sign-up link: `/join/demo-gym`.
- A login can be staff at a gym only once.
- A climber with passes, waivers or check-ins cannot be deleted.
- Row Level Security is enabled on every table, so Supabase's public API cannot read them.

## Checking someone in

1. Find them by QR, phone or name, within this gym only.
2. Waiver: they need one whose `version` matches the gym's `waiverVersion`. If the gym hasn't set one, any signed waiver is fine.
3. Pass: started, not expired, and visits left if it's a punch card.
4. Punch card? Take a punch.
5. Save the `CheckIn`. Turned-away visits aren't saved.

Busyness counts check-ins from the last 120 minutes.

## Table reference

Every table has an `id` (a UUID made by Prisma). Most also have `createdAt` and `updatedAt`, which fill themselves in.

### Gym

| Column | Type | Required | Notes |
|---|---|---|---|
| `name` | text | yes | |
| `slug` | text | yes, unique | Used in the sign-up link: `/join/demo-gym` |
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
| `pausedAt` | timestamp | no | Memberships only. Set while the membership is on hold |
| `externalId` | text | no | Its id in the gym's own system. Unique per gym |

### How the app shows waiver and membership status

Nothing stores a status. `src/features/climbers/status.ts` works it out from the rows:

- **Waiver:** the climber's latest `Waiver`. No row is `missing`. Signed more than a year ago, or on a different wording than the gym's `waiverVersion`, is `expired`. Otherwise `valid`.
- **Membership:** the climber's latest `MEMBERSHIP` pass. No row is `none`. Past `expiresAt` is `expired`, a set `pausedAt` is `paused`, otherwise `active`. `expiresAt` is the renewal date.
- **Demo and busyness climbers:** `prisma/seed.ts` stores the busyness mock's id (`climber-12`) or the demo username (`demo-valid-active`) in `externalId`, so the desk can link a mock check-in to the real climber and log in by username.

### Waiver

| Column | Type | Required | Notes |
|---|---|---|---|
| `gymId`, `climberId` | text | yes | |
| `version` | text | yes | Must match `Gym.waiverVersion` exactly |
| `signedAt` | timestamp | yes | Set automatically |
| `signedByName` | text | yes | |
| `signerRelation` | `SignerRelation` | yes | `SELF` (default), `PARENT`, `GUARDIAN` |
| `externalId` | text | no | Its id in Smartwaiver or similar. Unique per gym |
| `templateId` | text | no | The `WaiverTemplate` they agreed to. Empty for imported and older placeholder rows |
| `bodyHash` | text | no | The template's `bodyHash` at signing, to prove the wording didn't change |
| `signatureText` | text | no | The name they typed as their signature |
| `signatureImage` | text | no | A drawn signature, as a PNG data URL |
| `signedByAuthUserId` | text | no | The login that signed (a parent's, for a child) |
| `ipAddress`, `userAgent` | text | no | The signer's device, as evidence |
| `emergencyContactName`, `emergencyContactPhone` | text | no | Who to call if they get hurt, as given when they signed. Phone saved like `+12505551234` |

### WaiverTemplate

The waiver wording a gym asks climbers to sign. One row per version, never edited after publishing. `Gym.waiverVersion` names the current one.

| Column | Type | Required | Notes |
|---|---|---|---|
| `gymId` | text | yes | |
| `version` | text | yes | `v1`, `v2`... Unique per gym |
| `title` | text | yes | |
| `body` | text | yes | The waiver text. Blank lines separate paragraphs |
| `clauses` | text[] | yes | Short rules the climber ticks one by one |
| `bodyHash` | text | yes | SHA-256 of title, body and clauses (`src/features/waivers/hash.ts`) |
| `publishedAt` | timestamp | yes | Set automatically |

### CheckIn

| Column | Type | Required | Notes |
|---|---|---|---|
| `gymId`, `climberId` | text | yes | |
| `checkedInAt` | timestamp | yes | Set automatically |
| `method` | `CheckInMethod` | yes | `SELF`, `FRONT_DESK`, `QR` |
| `staffId` | text | no | Who checked them in |

Searchable by gym and time (busyness) and by climber and time (visit history).

### QrScan

| Column | Type | Required | Notes |
|---|---|---|---|
| `gymId`, `climberId` | text | yes | |
| `scannedAt` | timestamp | yes | Set automatically |
| `takenAt` | timestamp | no | Set when the desk shows it. Empty means still waiting |

The climber's phone saves one per scan; the desk takes the oldest waiting scan for its gym, once (a conditional update, so two desks never show the same scan). Scans older than two minutes are ignored. Kept in the database rather than server memory so it works when the app runs on several servers.

The full SQL is in [`migrations/`](migrations/), one folder per change, applied in order.

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

Never edit a migration after it's merged. Make a new one instead. CI fails a pull request that changes an existing migration, and checks that the migrations match `schema.prisma`. The full rules for changing a database that already has data are in [CONTRIBUTING.md](../CONTRIBUTING.md#database-changes).

### Other files

| File | What it is |
|---|---|
| `prisma/seed.ts` | Test data for your local database |
| `prisma7.config.ts` | Tells Prisma where the schema, migrations and seed live |
| `src/generated/prisma/` | Types Prisma generates. Not committed |
| `supabase/config.toml` | Local Supabase settings |
