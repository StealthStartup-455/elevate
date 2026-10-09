# Elevate

Management software for climbing gyms: a front desk app for staff and a dashboard for members.

Built with Next.js, Supabase (database and authentication) and Prisma.

## Getting started

### Requirements

- Node.js 24 or later (includes npm 11)
- npm
- Docker Desktop, running before you start the database

### Setup

```bash
git clone https://github.com/StealthStartup-455/elevate.git
cd elevate
npm install
cp .env.example .env
npm run db:start
```

The first `db:start` downloads Docker images and can take several minutes. When it finishes, it prints the local Supabase details. Copy the **publishable key** (called the **anon key** in older CLI versions) into `.env` as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Then start the app:

```bash
npm run db:migrate
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run lint` | Check code style |
| `npm run build` | Create a production build (also run by CI) |
| `npm run db:start` | Start local Supabase |
| `npm run db:stop` | Stop local Supabase |
| `npm run db:migrate` | Create and apply a migration after editing `schema.prisma` |
| `npm run db:seed` | Load sample data from `prisma/seed.ts` |
| `npm run db:studio` | Browse the database in the browser |

## Project structure

```
prisma/               Database schema, migrations and seed data
supabase/             Local Supabase configuration
src/
  app/                Pages and routes
    login/, join/     Public pages
    desk/             Staff front desk (login required)
    me/               Member dashboard (login required)
  features/           Business logic, one folder per feature
    auth/             Logins, roles and permissions
    check-ins/        Scanning, check-in and green/red status
    climbers/         Profiles, memberships and incidents
    waivers/          CSV import, matching and duplicate checks
    events/           Calendar, wall resets, bookings and announcements
    analytics/        Gym busyness and session stats
  components/ui/      Shared UI components
  lib/                Database and Supabase clients, shared helpers
  proxy.ts            Redirects logged-out users away from /desk and /me
```

Each feature folder has a README describing what it covers and who owns it.

## Conventions

- Pages in `src/app/` stay thin. They call into `src/features/` and never query the database directly.
- Feature folders follow the same layout: `actions.ts`, `queries.ts`, `components/` and `*.test.ts`.
- Every database table includes a `gymId`.
- All changes go through a pull request with one approval and passing CI.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.
