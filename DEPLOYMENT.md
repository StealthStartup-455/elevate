# Deployment

How the hosted Elevate demo runs, and how to release, migrate, reseed and roll it back. Issue #42 (staging deployment) and #43 (release checks), under #30.

## Environments

| Environment | Deploys from | Data | Login | Purpose |
|---|---|---|---|---|
| Local | your machine | `npm run db:seed` | demo login (`next dev`) | Development |
| **Hosted trial preview** | Trial deployment | fictional, seeded | demo login (`DEMO_MODE="true"`) | [Public application preview](https://elevate-trial.vercel.app/login); evaluation only, not production |
| Staging (planned) | `dev` | fictional, seeded | demo login (`DEMO_MODE="true"`) | Intended team staging environment; the shared hosting decision remains open in #30 |
| Production | `main` | a real gym's data | real sign-in only (#33) | The pilot. Not set up yet |

Staging never holds real member data: the demo login is a plain cookie anyone can set, including the one that opens the front desk. Production never runs the demo login: `APP_ENV="production"` switches it off even if `DEMO_MODE` is set by mistake (`src/features/auth/demo-mode.ts`).

## Hosting (proposed in #30)

- **App:** Vercel. Staging is the Vercel deployment of `dev`, made by GitHub Actions (`deploy-staging.yml`) on every merge; the Vercel project is not connected to the repository, so merges don't deploy twice.
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

GitHub (Settings, Environments, `staging`) holds what `deploy-staging.yml` needs:

| Secret | Value | Used by |
|---|---|---|
| `STAGING_DIRECT_URL` (secret) | Supabase **session pooler** URL (Connect, Session pooler: the pooler host, port 5432) | Applying migrations |
| `VERCEL_TOKEN` (secret) | A token from the team Vercel account (Account Settings, Tokens; scope: the team) | Deploying |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (secrets) | `orgId` and `projectId` from `.vercel/project.json`, which `npm run staging:setup` creates and prints at the end | Deploying to the right project |
| `STAGING_URL` (variable, optional) | The public address, e.g. `https://elevate-staging.vercel.app` | Checking the deploy shows Elevate's login |

Migrations need a session connection, not the transaction pooler; the Prisma CLI reads `DIRECT_URL` first and falls back to `DATABASE_URL` (`prisma7.config.ts`). Use the **session pooler**, not Supabase's "direct connection": the direct connection is IPv6 only, and GitHub Actions and many home networks are IPv4 only. In this document, "the session URL" means the session pooler URL.

## Setting up staging (once)

1. Create a Supabase project, region Canada (Central). From Connect, note the transaction pooler URL (port 6543) and the session pooler URL (port 5432).
2. Apply the migrations: from your machine, once, `DIRECT_URL="<session url>" npx prisma migrate deploy`. After this, the deploy workflow does it.
3. Seed fictional data once: `DATABASE_URL="<session url>" npm run db:seed`.

On Windows PowerShell, set the variable on its own line first, for example `$env:DIRECT_URL="<session url>"`, then run the command; `Remove-Item Env:DIRECT_URL` afterwards so later commands use your local database again.
4. Create the Vercel project and add the variables above (the setup script below does steps 2 to 4 and 6 to 7). Don't connect it to the GitHub repository; GitHub Actions deploys it.
5. In GitHub, add the `staging` environment with the secrets and variable above. From then on every merge to `dev` deploys staging.
6. Open the Vercel URL, log in as `desk` / `desk` on a laptop and as `demo-valid-active` on a phone, and run the demo: scan on the phone, check in at the desk.
7. Run the end to end test against it: `E2E_BASE_URL="https://<staging url>" npm run test:e2e`.

### Setup script

`npm run staging:setup` does steps 2 to 7 in one run, and repeats safely: it asks for the two pooler URLs, the project URL and the publishable key (or reads `STAGING_TRANSACTION_URL`, `STAGING_SESSION_URL`, `STAGING_SUPABASE_URL`, `STAGING_PUBLISHABLE_KEY`), applies the migrations, seeds, logs in to and links Vercel if needed, sets the variables above on the Vercel project, deploys with `--prod`, checks that `/login` answers, and offers to run the end to end tests and reseed. It stops on the usual mistakes: the IPv6 only direct connection, `[YOUR-PASSWORD]` left in a URL, or `APP_ENV=production`. `--skip-db` redeploys without touching the database. It deploys from your machine; connecting the repository to Vercel (step 4) is the team's decision in #30.

### Trial deploy from your machine

To try a branch on real hosting before it merges, without connecting the repository to Vercel:

1. Steps 1 to 3 above, on a Supabase project used only for trials.
2. `npx vercel link` in the repository, creating a new Vercel project; add the variables above under Project Settings, Environment Variables (Preview and Production).
3. `npx vercel deploy`. `.vercelignore` keeps your local `.env` out of the upload.
4. Steps 6 and 7 above against the URL it prints. Note anything in this document that was wrong or missing, and fix it in the same pull request.

## Real logins on a hosted project

Sign in is Supabase email and password (`src/features/auth/actions.ts`). A login only gets in if it has a `Staff` row (goes to `/desk`) or a linked `Climber` (goes to `/me`). Production runs with `DEMO_MODE` unset and `APP_ENV="production"`, so this is the only way in.

In the Supabase dashboard:

1. Authentication, Sign In / Providers: Email is on. Leave "Confirm email" off until a real email sender is set up (#30).
2. Same page: turn off **Allow new users to sign up**. The publishable key is in every page, so with sign ups on anyone can make a Supabase login without our form. The app only lets staff into `/desk` (`src/features/auth/staff.ts`), but nobody should get a login we didn't create.
3. Authentication, URL Configuration: set Site URL to the app's URL. Password sign in works without it; email links (confirm, reset) don't.
4. Authentication, Users, Add user, Create new user, with "Auto Confirm User" ticked. Copy the new user's UID.
5. SQL Editor, to make them staff:

   ```sql
   insert into "Staff" (id, "gymId", "authUserId", name, "updatedAt")
   select gen_random_uuid()::text, id, '<user uid>', '<their name>', now()
   from "Gym" where slug = 'boulderhouse-victoria';
   ```

   Or, for a climber who already exists: `update "Climber" set "authUserId" = '<user uid>' where id = '<climber id>';`

To switch someone off, set `active = false` on their `Staff` row.

**Staging only:** the seed can make the two test logins (`desk@elevate.test` and `climber@elevate.test`) on a hosted project too. Run it with that project's values: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` (Project Settings, API Keys), `SEED_LOGIN_PASSWORD` and `DATABASE_URL="<session url>"`. Never on production: everyone on the team would know the password.

## Releasing

Every pull request runs lint, unit tests and the build (`check`), and the database tests, a migration check and the Playwright demo flow (`e2e`). A merge to `dev` runs `deploy-staging.yml`, which, in order:

1. applies any new migrations to the staging database (`prisma migrate deploy`),
2. builds and deploys the app on Vercel (`vercel deploy --prod`),
3. checks that `STAGING_URL/login` shows Elevate's login.

Nobody runs anything by hand. To redeploy without a merge: Actions, Deploy staging, Run workflow. Migrations land before the new code, but the old code keeps serving until the deploy finishes, so every migration must still work with both the old and the new code (see "Database changes" in `CONTRIBUTING.md`: add, never rename or drop in the same release).

The Milestone 3 release candidate follows the release steps in `CONTRIBUTING.md`: `dev` into `release`, tested, then `main`, tagged `v0.3.0`.

## Before a demo

- Resume the Supabase project if it was paused (Dashboard, Resume project). Nothing is lost.
- Reseed so the demo starts clean, because the two hour check-in rule remembers earlier runs: `DATABASE_URL="<session url>" npm run db:seed`.
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
| `login_succeeded` / `login_failed` | Log in (Supabase or demo) | `role`, `staffId` or `climberId`; or `reason`: `missing_fields`, `no_account`, a Supabase error code such as `invalid_credentials`, or for the demo login `wrong_password`, `unknown_user` |
| `climber_created` / `climber_updated` | Join, desk add, desk edit | `climberId`, `source`: `self` or `desk` |
| `climber_form_invalid` | A form was sent back with errors | `form`, `fields` (field names only) |
| `waiver_signed` | Placeholder waiver signed | `climberId`, `version` |
| `scan_saved` / `scan_taken` | Phone scan saved; the desk showed it | `climberId`; `waitMs` (time from tap to desk), `waiverStatus`, `membershipStatus` |
| `check_in_saved` / `check_in_refused` | Desk check in | `climberId`, `method`; or `reason`: `waiver_missing`, `waiver_expired`, `membership_none`, `membership_expired`, `membership_paused`, `already_checked_in`, `not_found`, `invalid_id` |
| `day_pass_given` / `day_pass_refused` | Desk gave a no-charge day pass (stopgap, #62) | `climberId`, `charge`: `none`; or `reason`: `waiver_missing`, `waiver_expired`, `membership_active`, `not_found`, `invalid_id` |

**When someone reports an error**, ask for the error code on the "Something went wrong" page. It is the `digest` of the matching `server_error` line.

**Privacy:** log lines carry ids and reason codes only, never names, phone numbers, emails or anything typed into a form. Keep it that way when adding events.

**Useful numbers from the logs during a pilot:** `waitMs` on `scan_taken` (how fast the desk sees a scan), and `check_in_refused` by `reason` (which rule turns people away).

## If something breaks

| Symptom | Likely cause | Fix |
|---|---|---|
| Every page is Vercel's "404: NOT_FOUND" after a successful deploy | The Vercel project's framework isn't Next.js (projects made with `vercel project add` have none) | `vercel.json` sets it; deploy again from a checkout that has it |
| Deploy fails: Node.js version discontinued | Vercel project set to an old Node | `package.json` `engines` pins Node 24; make sure it is committed, then deploy again |
| Every page errors, logs mention connections | Paused Supabase project, or a wrong `DATABASE_URL` | Resume the project; check the pooler URL and `?pgbouncer=true` |
| `desk` / `desk` says "Unknown email or password" | Demo login is off: `DEMO_MODE` not `true`, or `APP_ENV` set to `production` | On staging, fix the variables and redeploy. Elsewhere use a real login |
| A real login says "This login isn't set up for the gym yet" | The Supabase user has no `Staff` row and no linked `Climber` | Add the row (see "Real logins on a hosted project") |
| Phone scans but the desk shows nothing | The `QrScan` migration isn't applied | Run the deploy workflow (Actions, Deploy staging, Run workflow) |
| Deploy workflow says "Staging is not set up" | A secret is missing from the `staging` environment | Add it (see Environment variables) and run the workflow again |
| `prisma migrate deploy` warns that migrations were modified | Someone edited a merged migration | Restore the original file; never reset staging |
| Check in refused, "Already checked in" | The two hour rule from an earlier run | Reseed |
