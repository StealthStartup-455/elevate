# Elevate

Management software for climbing gyms: a front desk app for staff and a dashboard for members.

Built with Next.js, Supabase (database and authentication) and Prisma.

## Product page

The product page is live at: https://stealthstartup-455.github.io/elevate/.

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

| Command                 | Description                                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`           | Start the development server                                                                                                                                                                       |
| `npm run lint`          | Check code style                                                                                                                                                                                   |
| `npm run build`         | Create a production build (also run by CI)                                                                                                                                                         |
| `npm test`              | Unit tests (Vitest)                                                                                                                                                                                |
| `npm run test:db`       | Database tests; needs the local database running                                                                                                                                                   |
| `npm run test:e2e`      | End to end tests (Playwright): the demo flow, and automated accessibility checks (axe, WCAG 2.1 AA) on every main screen in light and dark mode; needs `npm run build` and `npm run db:seed` first |
| `npm run db:start`      | Start local Supabase                                                                                                                                                                               |
| `npm run db:stop`       | Stop local Supabase                                                                                                                                                                                |
| `npm run db:migrate`    | Create and apply a migration after editing `schema.prisma`                                                                                                                                         |
| `npm run db:seed`       | Load sample data from `prisma/seed.ts`                                                                                                                                                             |
| `npm run db:studio`     | Browse the database in the browser                                                                                                                                                                 |
| `npm run staging:setup` | Set up or refresh a hosted demo on Supabase and Vercel (see `DEPLOYMENT.md`)                                                                                                                       |

Before the first `npm run test:e2e`, install the test browser once: `npx playwright install chromium`. CI runs all three test suites on every pull request.

How the database works, its tables and how to change them: [`prisma/DATABASE.md`](prisma/DATABASE.md).

How the hosted staging demo is deployed, migrated, reseeded and rolled back: [`DEPLOYMENT.md`](DEPLOYMENT.md).

How the app looks and behaves (colors, type, spacing, hover rules, components): [`STYLE_GUIDE.md`](STYLE_GUIDE.md). With `npm run dev` running, open http://localhost:3000/style-guide to see it live.

## License

All rights reserved; see [`LICENSE`](LICENSE). The repository is public so the team and course staff can review it, but that grants no right to copy or reuse the code. Contact the team before reusing anything.

## Project structure

```
prisma/               Database schema, migrations and seed data
supabase/             Local Supabase configuration
src/
  app/                Pages and routes
    login/, join/     Public pages
    desk/             Staff front desk (login required)
    me/               Member dashboard (login required)
    style-guide/      Live style guide
  features/           Business logic, one folder per feature
    auth/             Logins, roles and permissions
    check-ins/        Scanning, check-in and green/red status
    climbers/         Profiles, memberships and incidents
    waivers/          CSV import, matching and duplicate checks
    events/           Calendar, wall resets, bookings and announcements
    analytics/        Gym busyness and session stats
  components/ui/      Shared UI components and the theme (theme/tokens.ts holds every design value)
  lib/                Database and Supabase clients, shared helpers
  proxy.ts            Redirects logged-out users away from /desk and /me
```

Each feature folder has a README describing what it covers and who owns it.

## Conventions

- Pages in `src/app/` stay thin. They call into `src/features/` and never query the database directly.
- Feature folders follow the same layout: `actions.ts`, `queries.ts`, `components/` and `*.test.ts`.
- Every database table includes a `gymId`.
- Branch from `dev` and open pull requests into `dev`. `release` and `main` only receive releases and hotfixes.
- All changes go through a pull request with one approval and passing CI.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.
