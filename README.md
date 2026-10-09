# Elevate

Front desk and member app for climbing gyms. One Next.js app (PWA) with Supabase for the database and logins, and Prisma for database access.

## Getting started

You need **Node 22+**, **npm** and **Docker Desktop** (running).

```bash
git clone https://github.com/StealthStartup-455/elevate.git
cd elevate
npm install
cp .env.example .env
npm run db:start        # starts local Supabase (first run downloads images)
```

`db:start` prints an API URL and a **publishable key**. Paste the key into `.env` as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then:

```bash
npm run db:migrate      # apply the database schema
npm run dev             # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run the app locally |
| `npm run lint` | Check code style |
| `npm run build` | Production build (CI runs this) |
| `npm run db:start` / `db:stop` | Start / stop local Supabase |
| `npm run db:migrate` | Create and apply a migration after editing `schema.prisma` |
| `npm run db:seed` | Load fake data from `prisma/seed.ts` |
| `npm run db:studio` | Browse the database in your browser |

## Folder map

```
prisma/              database schema, migrations, seed data
supabase/            local Supabase config
src/app/             pages and routes, keep them thin
  login/ join/       public pages
  desk/              staff front desk
  me/                member dashboard
src/features/        business logic, one owner per folder
  auth/              logins, roles, permissions
  check-ins/         scanning, check-in, green/red status
  climbers/          profiles, memberships, incidents
  waivers/           CSV import, matching, duplicates
  events/            calendar, resets, bookings, announcements
  analytics/         busyness, session stats
src/components/ui/   shared UI (Chalk theme)
src/lib/             database and Supabase clients, tiny helpers
src/proxy.ts         sends logged-out users to /login
```

## Team rules

1. **Every folder has a `README.md`** saying what goes in it.
2. **Feature folders share one shape:** `actions.ts`, `queries.ts`, `components/`, `*.test.ts`.
3. **Pages stay thin.** Files in `src/app/` call into `src/features/` and never query the database directly.
4. **Every table has a `gymId`.**
5. **No direct pushes to `main`.** Open a PR; it needs one review and a green CI check. See [CONTRIBUTING.md](CONTRIBUTING.md).

