# Deployment

How the hosted Elevate demo runs, and how to release, migrate, reseed and roll it back. Issue #42 (staging deployment) and #43 (release checks), under #30.

## Environments

| Environment | Deploys from | Data | Login | Purpose |
|---|---|---|---|---|
| Local | your machine | `npm run db:seed` | demo login (`next dev`) | Development |
| **Staging** | `dev` | fictional, seeded | demo login (`DEMO_MODE="true"`) | The live demo the product page links to; Milestone 3 |
| Production | `main` | a real gym's data | real sign-in only (#33) | The pilot. Not set up yet |

Staging never holds real member data. Production never runs the demo login: `APP_ENV="production"` switches it off even if `DEMO_MODE` is set by mistake (`src/features/auth/demo-mode.ts`).

## Hosting (proposed in #30)

- **App:** Vercel, connected to this repository. Staging is the Vercel deployment of `dev`.
- **Database:** a hosted Supabase project in the Canada (Central) region, one per environment.
- **Accounts:** owned by the team, not one person. On the free tiers, Vercel's Hobby plan is for non-commercial use and Supabase's free plan has no backups and pauses after a week without activity; both need their paid plans before a pilot with a real gym.

## Environment variables

Set these in Vercel (Project Settings, Environment Variables), never in the repository.

| Variable | Staging value | Notes |
|---|---|---|
| `DATABASE_URL` | Supabase **transaction pooler** URL, port 6543, ending `?pgbouncer=true` | The app's connection. Serverless functions open many short connections, so they go through the pooler |
| `NEXT_PUBLIC_SUPABASE_URL` | the Supabase project URL | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the project's publishable key | Public by design |
| `DEMO_MODE` | `true` | Staging only |
| `APP_ENV` | `staging` | `production` on the production project |
| `MOCK_BUSYNESS_SCENARIO` | `moderate` | Until busyness uses real check-ins (#39) |

GitHub (Settings, Environments, `staging`) holds one secret:

| Secret | Value | Used by |
|---|---|---|
| `STAGING_DIRECT_URL` | Supabase **direct** connection URL, port 5432 | `.github/workflows/migrate-staging.yml`, to apply migrations |

Migrations need the direct connection; the Prisma CLI reads `DIRECT_URL` first and falls back to `DATABASE_URL` (`prisma7.config.ts`).

## Setting up staging (once)

1. Create a Supabase project, region Canada (Central). Note the pooler URL (port 6543) and the direct URL (port 5432).
2. Apply the migrations: from your machine, once, `DIRECT_URL="<direct url>" npx prisma migrate deploy`. After this, CI does it.
3. Seed fictional data once: `DATABASE_URL="<direct url>" npm run db:seed`.
4. Create the Vercel project from this repository; set the production branch for this project to `dev`; add the variables above.
5. Add the `staging` environment and `STAGING_DIRECT_URL` secret in GitHub.
6. Open the Vercel URL, log in as `desk` / `desk` on a laptop and as `demo-valid-active` on a phone, and run the demo: scan on the phone, check in at the desk.
7. Run the end to end test against it: `E2E_BASE_URL="https://<staging url>" npm run test:e2e`.

## Releasing

Every pull request runs lint, unit tests and the build (`check`), and the database tests, a migration check and the Playwright demo flow (`e2e`). A merge to `dev`:

1. applies any new migrations to the staging database (`migrate-staging.yml`), then
2. Vercel builds and deploys `dev` to staging.

Migrations are applied before the new code serves traffic only if the workflow finishes before Vercel's build; for that reason every migration must work with both the old and the new code (see "Database changes" in `CONTRIBUTING.md`: add, never rename or drop in the same release).

The Milestone 3 release candidate follows the release steps in `CONTRIBUTING.md`: `dev` into `release`, tested, then `main`, tagged `v0.3.0`.

## Before a demo

- Resume the Supabase project if it was paused (Dashboard, Resume project). Nothing is lost.
- Reseed so the demo starts clean, because the two hour check-in rule remembers earlier runs: `DATABASE_URL="<direct url>" npm run db:seed`.
- Run `E2E_BASE_URL="https://<staging url>" npm run test:e2e`, then reseed again.
- Use two browser windows or devices: the climber's phone and the desk.
- Code freeze the day before; demo from the tagged release.

## Rolling back

- **Code:** in Vercel, open Deployments and promote the previous deployment. Instant.
- **Database:** migrations are never rolled back by hand. Fix forward with a new migration. Because every migration keeps working with the previous code, rolling back the code alone is safe.
- **Data on staging:** reseed.

## Logs and errors

The server writes one JSON line per event to standard output (`src/lib/log.ts`). On Vercel, open the deployment, then Logs, and search by `event` or any field. The free plan keeps one hour of runtime logs; an error monitoring service can be added later in `src/instrumentation.ts`.

| Event | When | Fields |
|---|---|---|
| `server_error` | Any error Next.js catches on the server (`src/instrumentation.ts`) | `path` (no query string), `method`, `routePath`, `routeType`, `errorName`, `errorMessage`, `digest`, `stack` |
| `login_succeeded` / `login_failed` | Demo login | `role`, `climberId`; or `reason`: `demo_mode_off`, `wrong_password`, `unknown_user` |
| `climber_created` / `climber_updated` | Join, desk add, desk edit | `climberId`, `source`: `self` or `desk` |
| `climber_form_invalid` | A form was sent back with errors | `form`, `fields` (field names only) |
| `waiver_signed` | Placeholder waiver signed | `climberId`, `version` |
| `scan_saved` / `scan_taken` | Phone scan saved; the desk showed it | `climberId`; `waitMs` (time from tap to desk), `waiverStatus`, `membershipStatus` |
| `check_in_saved` / `check_in_refused` | Desk check in | `climberId`, `method`; or `reason`: `waiver_missing`, `waiver_expired`, `membership_none`, `membership_expired`, `membership_paused`, `already_checked_in`, `not_found`, `invalid_id` |

**When someone reports an error**, ask for the error code on the "Something went wrong" page. It is the `digest` of the matching `server_error` line.

**Privacy:** log lines carry ids and reason codes only, never names, phone numbers, emails or anything typed into a form. Keep it that way when adding events.

**Useful numbers from the logs during a pilot:** `waitMs` on `scan_taken` (how fast the desk sees a scan), and `check_in_refused` by `reason` (which rule turns people away).

## If something breaks

| Symptom | Likely cause | Fix |
|---|---|---|
| Every page errors, logs mention connections | Paused Supabase project, or a wrong `DATABASE_URL` | Resume the project; check the pooler URL and `?pgbouncer=true` |
| Log in says "Log in isn't available yet" | `DEMO_MODE` not `true`, or `APP_ENV` set to `production` | Fix the variables and redeploy |
| Phone scans but the desk shows nothing | The `QrScan` migration isn't applied | Run the migrate workflow (Actions, Migrate staging database, Run workflow) |
| `prisma migrate deploy` warns that migrations were modified | Someone edited a merged migration | Restore the original file; never reset staging |
| Check in refused, "Already checked in" | The two hour rule from an earlier run | Reseed |
