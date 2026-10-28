# Exchange Floor

The shared, living log of everything AI agents do in this repo. Every agent **reads this before starting a task** and **adds an entry when it finishes** (see "Exchange Floor" in `AGENTS.md`).

It exists so that one person's agent never repeats, contradicts or breaks what another person's agent already did.

## How to use it

**Before you start a task**

1. `git fetch origin` and read this file from `origin/dev`, not a stale local copy.
2. Read at least the **Active work** table and the last 10 timeline entries. Read further back if your task touches the same files or area.
3. If someone else's agent is already working on the same area, or left an open follow-up for it, tell the developer before you begin.

**When you finish a task**

1. Add a row to **Active work** when you start, and remove it (or mark it done) when you finish.
2. Add a new entry at the **top** of the timeline, newest first, using the template below.
3. Commit the update in the same pull request as the work, so the log merges with the change it describes.

**Rules**

- Append only. Never delete or rewrite another entry. Correct a mistake with a new entry that references the old one.
- Facts, not narrative. Say what was done, what was decided, and what the next agent must know.
- Never put secrets, tokens, `.env` values or personal data in an entry.
- Resolve merge conflicts by keeping both sets of entries, ordered by date and time.

## Active work

| Started (UTC) | Developer | AI tool | Branch | Area / files | Status |
|---|---|---|---|---|---|
| 2026-10-23 | @ekamgill | Copilot CLI | `feature/59-update-product-page` | Product page, `README.md`, `DEPLOYMENT.md`, `EXCHANGE_FLOOR.md` | Owner-focused B2B page with live demo, real screenshots, discovery-informed copy, transparent preview/pricing details, and supporting docs |
| 2026-10-16 | @ekamgill | Copilot CLI | `feature/24-update-logo-product-page` | `docs/index.html`, `docs/styles.css`, `docs/assets/`, `EXCHANGE_FLOOR.md` | In review (#25) |
| 2026-10-11 | @agamk | Claude Code | `docs/19-exchange-floor` | `EXCHANGE_FLOOR.md`, `AGENTS.md`, agent config | In review |
| 2026-10-11 | @sethmess | Claude Code | `feature/38-busyness-tracker` | `src/features/analytics/`, `src/features/climbers/` (membership card), `src/lib/fuzzy.ts`, `/`, `/desk` and `/me` pages, MUI setup | In review |
| 2026-10-13 | @agamkamran02 | Claude Code | `feature/33-account-creation-customer` | `src/features/climbers/*`, `src/app/join` | In review |
| 2026-10-13 | @agamkamran02 | Claude Code | `feature/34-account-creation-front-desk` | `src/features/climbers/*`, `src/app/desk/climbers/*` | In review (stacked on #33 branch) |
| 2026-10-13 | @agamkamran02 | Claude Code | `feature/41-account-login` | `src/features/auth/*`, `/`, `/login`, `/me`, `src/features/climbers/*` | In review (stacked on #33/#34 branches) |
| 2026-10-14 | @TylerLeHere | Claude Code | `feature/21-build-a-mock-database` | `prisma/DATABASE.md`, `README.md` | Done (docs only) |
| 2026-10-14 | @agamkamran02 | Claude Code | `42-connect-frontend-and-backend` | `src/features/climbers/*`, `src/features/auth/*`, `src/lib/gym.ts`, `prisma/seed.ts`, `prisma/schema.prisma` | In review |
| 2026-10-15 | @Khanh150104 | Claude Code | `feature/36-check-in-front-desk` | `src/features/check-ins/*`, `MembershipCard.tsx`, `/desk` page | In review |
| 2026-10-14 | @Scott-Squires | Claude Code | `feature/16-style-guide` | `STYLE_GUIDE.md`, `src/components/ui/` (theme, shared components), `globals.css`, root layout, lint rules, small edits across existing screens | In review |
| 2026-10-15 | @Scott-Squires | Claude Code | `feature/22-logo-first-pass` | `src/components/ui/Logo.tsx`, `public/brand/`, app icons (`src/app/favicon.ico`, `icon.png`, `apple-icon.png`), `/` and `/login` pages, `/desk` and `/me` nav bars | In progress (stacked on `feature/16-style-guide`) |
| 2026-10-20 | @guerrerj | Claude Code | `feature/42-staging-deployment` | `src/features/check-ins/scan-store.ts`, `src/features/auth/*`, `src/proxy.ts`, `prisma/` (new `QrScan` migration), fonts, tests, CI, `DEPLOYMENT.md` | Merged (#72) |
| 2026-10-22 | @guerrerj | Claude Code | `feature/30-deploy-staging-on-merge` | `.github/workflows/deploy-staging.yml`, `scripts/staging-setup.mjs`, `DEPLOYMENT.md` | In review |
| 2026-10-20 | @guerrerj | Claude Code | `feature/42-staging-deployment` | `src/features/check-ins/scan-store.ts`, `src/features/auth/*`, `src/proxy.ts`, `prisma/` (new `QrScan` migration), fonts, tests, CI, `DEPLOYMENT.md` | In review |
| 2026-10-22 | @TylerLeHere | Claude Code | `feature/33-supabase-auth-sign-in-out` | `src/features/auth/*`, `src/app/desk/*`, `src/features/climbers/{queries,actions}.ts`, `src/features/check-ins/actions.ts`, `prisma/seed-logins.ts`, `e2e/`, `DEPLOYMENT.md` | In review |
| 2026-10-24 | @guerrerj | Claude Code | `chore/71-add-license` | `LICENSE`, `README.md`, `package.json` | In review |
| 2026-10-27 | @guerrerj | Claude Code | `fix/77-pin-ci-runner` | `.github/workflows/ci.yml` | In review |
| 2026-10-27 | @guerrerj | Claude Code | `feature/64-label-mock-busyness` | `src/features/analytics/*`, `e2e/sample-data.spec.ts`, `DEPLOYMENT.md` | In review |
| 2026-10-27 | @guerrerj | Claude Code | `fix/66-shorten-placeholder-waiver` | `src/features/climbers/components/WaiverStep.tsx`, `e2e/smoke.spec.ts` | In review |

## Entry template

Copy this block to the top of the timeline.

```markdown
### YYYY-MM-DD HH:MM UTC: <short title>

- **Developer:** @github-handle
- **AI tool / model:** e.g. Claude Code (claude-sonnet-5-5), Copilot, Cursor, Codex
- **Issue / PR:** <owner/repo>#<number> / #<pr-number>
- **Branch:** `<type>/<issue-number>-<description>`
- **What the agent did:** one to five bullets
- **Files touched:** key paths, not every file
- **Decisions and why:** choices another agent might otherwise reverse
- **Gotchas:** surprises, failing checks, things that look wrong but are intended
- **Open follow-ups:** work left undone, or `None`
- **Verification:** commands run and the real results (`npm run lint`, `npm run build`, tests)
```

## Timeline

Newest first.

### 2026-10-27 UTC: Generated busyness data is labelled on screen

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#64 / PR pending
- **Branch:** `feature/64-label-mock-busyness`
- **What the agent did:**
  - Each busyness result now says what is generated: `sampleCount` on the summaries, `sample` on each desk row and on the typical week.
  - Desk card: "Demo data: 28 of these 29 check-ins are samples, not real visits." Climber card: "Demo data: includes 28 sample check-ins, not real visits." Heat map: "Demo data: a sample week, not this gym's history." No count label when only real check-ins are shown.
  - `MOCK_BUSYNESS_SCENARIO=none` turns generated check-ins off (real only), so the no-label case can actually happen.
  - Tests: `src/features/analytics/sample.test.ts` (counts, rows, `none`, the week); `e2e/sample-data.spec.ts` (labels on the desk and climber cards).
- **Files touched:** `src/features/analytics/{mock-data,types,queries,sample.test}.ts`, `src/features/analytics/components/{FrontDeskBusyness,CustomerBusyness,BusynessHeatMap}.tsx`, `src/features/analytics/README.md`, `e2e/sample-data.spec.ts`, `DEPLOYMENT.md`
- **Decisions and why:**
  - Counted per check-in rather than a global "demo mode" flag, so the label is exact when generated and real visits are mixed (the desk saves real ones on top of the mock).
  - The heat map is always labelled: there is no real version yet. It goes when #39 computes the week from saved check-ins.
  - Plain wording ("samples, not real visits"): owners asked "is that real?" is the risk #64 names, and honesty matters after a gym pushed back on a mixed message about having a product.
- **Gotchas:** The label sits in the heat map component, so the climber card shows it under "Today" and again inside "Show full week" (collapsed). The climber card's "Live" tag predates this and still shows next to sample data.
- **Open follow-ups:** Remove the labels and `sample` fields with the mock in #39. Consider the "Live" tag then.
- **Verification:** `npm run lint` and `npx tsc --noEmit` clean; `npm test` 69 passed (2 todo), 4 new; `npm run build` passed; `npx playwright test` 14 passed, 3 skipped (real-login needs seeded Supabase logins), including the 2 new label tests and axe on every screen in light and dark. Desk (light) and climber card (dark, phone) checked by eye.
### 2026-10-27 UTC: Placeholder waiver signs in under a second

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#66 / PR pending
- **Branch:** `fix/66-shorten-placeholder-waiver`
- **What the agent did:**
  - `WaiverStep`: the placeholder spinner waits 300 ms instead of 5 seconds, marked as a stopgap until #35 / #36.
  - `e2e/smoke.spec.ts`: the join test expects "Waiver signed." within 3 seconds of tapping "Sign a waiver now".
- **Files touched:** `src/features/climbers/components/WaiverStep.tsx`, `e2e/smoke.spec.ts`
- **Decisions and why:** Kept a short spinner rather than none so the step doesn't flash past; 300 ms plus the server action stays under the 1 second in #66. The test allows 3 seconds so a slow CI runner doesn't fail it, which still catches the old 5 second wait.
- **Gotchas:** None.
- **Open follow-ups:** Replace the whole component with the real waiver flow (#35, #36).
- **Verification:** `npm run lint` and `npx tsc --noEmit` clean; `npm test` passed; `npm run build` passed; `npx playwright test e2e/smoke.spec.ts` 4 passed (the join test went from about 11 s to 6 s). With the old 5000 ms value the new assertion failed, as intended.

### 2026-10-27 UTC: Pin CI to Ubuntu 24.04 so e2e can install Chromium

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#77 / PR pending
- **Branch:** `fix/77-pin-ci-runner`
- **What the agent did:**
  - `ci.yml`: both jobs (`check` and `e2e`) run on `ubuntu-24.04` instead of `ubuntu-latest`.
- **Files touched:** `.github/workflows/ci.yml`
- **Decisions and why:**
  - GitHub moved `ubuntu-latest` to Ubuntu 26.04, and Playwright 1.56.1 can't install Chromium there ("Playwright does not support chromium on ubuntu26.04-x64"), so every PR's e2e job failed at `npx playwright install --with-deps chromium`. Pinning the runner is the smallest safe fix; upgrading Playwright was not chosen because 26.04 support in a newer version wasn't confirmed.
  - `check` is pinned too, so both jobs run on the same OS. `deploy-staging.yml`, `deploy-pages.yml` and `branch-policy.yml` install no browsers and stay on `ubuntu-latest`.
- **Gotchas:** Open PRs (for example #75) keep failing e2e until they merge `dev` after this lands.
- **Open follow-ups:** Move back to `ubuntu-latest` once a Playwright release supports Ubuntu 26.04, upgrading `@playwright/test` at the same time.
- **Verification:** Not reproducible locally (the failure depends on the runner image). The workflow file parses; the real check is this PR's own CI run.

### 2026-10-25 05:36 UTC: Supabase email sign in, staff-only desk

- **Developer:** @TylerLeHere
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#33 / PR pending
- **Branch:** `feature/33-supabase-auth-sign-in-out`
- **What the agent did:**
  - Real sign in and out with Supabase email and password; staff go to `/desk`, climbers to `/me`. The demo login still works in demo mode.
  - The seed makes two local test logins, `desk@elevate.test` and `climber@elevate.test`, when `SUPABASE_SECRET_KEY` and `SEED_LOGIN_PASSWORD` are set.
  - After review: `/desk` is staff only. `requireStaff()` / `isStaff()` (`src/features/auth/staff.ts`) are called in the desk layout, the desk-only queries (`listClimbers`, `getCheckInClimbers`), the climber detail page, and the staff actions (`createClimberAtDesk`, `updateClimber`, `checkInClimber`, `takeLatestScan`). `signWaiver` takes the caller's own id or staff.
  - Staff opening `/me` with no climber of their own go to `/desk` instead of log in.
  - `getFrontDeskBusyness` (names and phones) checks for staff itself too.
  - Tests: the login action with Supabase faked (`actions.test.ts`, runs in CI); real climber and desk logins against `/desk`, `/me` and a staff action (`e2e/real-login.spec.ts`, local only).
  - DEPLOYMENT.md: turn off "Allow new users to sign up" in Supabase; why staging must never hold real data (the demo desk cookie can be forged).
- **Files touched:** `src/features/auth/{staff,staff.test,actions.test,session,queries,actions}.ts`, `src/app/desk/layout.tsx`, `src/app/desk/climbers/[climberId]/page.tsx`, `src/features/climbers/{queries,actions}.ts`, `src/features/check-ins/actions.ts`, `src/features/analytics/{queries,queries.test}.ts`, `prisma/seed-logins.ts`, `e2e/{real-login.spec,server-actions-auth.spec,action-id}.ts`, `DEPLOYMENT.md`, `README.md`
- **Decisions and why:**
  - The staff check sits next to the data, not only in the desk layout: a layout doesn't re-run on navigation and a page can render without it (Next.js auth guide, "Layouts and auth checks"). The layout gate only hides the desk UI.
  - `getClimber` and `getSavedCheckIns` have no staff check on purpose: `/me` (own record, busyness count) reads them. Desk callers check first.
  - The proxy still only checks "signed in"; it stays off the database.
- **Gotchas:**
  - With Cache Components, call `await connection()` before `requireStaff()` in a component: the Supabase check reads the clock, and without it the server logs "unstable value `Date.now()` while prerendering".
  - `e2e/server-actions-auth.spec.ts` no longer has `test.fail`; the checks it waited for (#34) are in.
  - `next build` sometimes stops once on a Next.js security advisory reminder; running it again continues.
  - In production the waiver step right after `/join` now says "Log in to sign the waiver": `signWaiver` takes only the caller's own climber or staff, and `/join` doesn't sign anyone in yet. Before, anyone could sign a waiver for any climber.
- **Open follow-ups:** `/join` creates a climber with no Supabase login, so a new member can't sign in (or sign the waiver) in production; with public sign ups off it needs a server-side account or invite (own issue). Real login end to end in CI needs a CI job with local Supabase. `signWaiver` matches only the login's first climber; check all of `climberIds` once parents can switch kids. Set `staffId` / `createdByStaffId` from the signed-in staff member. Upgrade Next.js for the advisory `next build` reports.
- **Verification:** `npm run lint` clean; `npx tsc --noEmit` clean; `npm test` 65 passed (2 todo); `npm run test:db` 7 passed; `npm run build` passed; `npx playwright test` 15 passed locally with the seeded real logins. With `SEED_LOGIN_PASSWORD` unset (as in CI) the 3 tests in `e2e/real-login.spec.ts` skip. Each new test was seen failing: the staff and server-action tests against the code before the fix, the login action tests by breaking `login` on purpose.
### 2026-10-24 UTC: All rights reserved licence; repo stays public for now

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#71 / PR pending
- **Branch:** `chore/71-add-license`
- **What the agent did:** Added a `LICENSE` file (copyright the Elevate team, all rights reserved), pointed the README's License section to it, and set `"license": "UNLICENSED"` in `package.json` (npm's marker for code that isn't open source).
- **Files touched:** `LICENSE`, `README.md`, `package.json`, `EXCHANGE_FLOOR.md`
- **Decisions and why:** No open source licence, since the team hasn't decided to give the code away. The repository stays public for now: on GitHub's free organization plan a private repo loses GitHub Pages (the product page), enforced branch rules, and unlimited Actions minutes. Reasons are in the #71 comment.
- **Gotchas:** The licence names the team, not individuals; ownership among members is for the team's agreement.
- **Open follow-ups:** Check whether the course requires a public repo; settle ownership; move the product page before going private; rename the seed gym (#67).
- **Verification:** `npm run lint` clean; `package.json` parses; no code changes.

### 2026-10-23 06:43 UTC: Owner-focused product page and project documentation

- **Developer:** @ekamgill
- **AI tool / model:** Copilot CLI
- **Issue / PR:** StealthStartup-455/elevate#59 / PR created after this entry
- **Branch:** `feature/59-update-product-page`
- **What the agent did:**
  - Updated the product page for independent climbing-gym owners and managers, reflecting discovery findings while distinguishing buyers, front-desk users, and climbers.
  - Added live-demo links, actual app screenshots, concise value and audience copy, transparent preview/pricing details, and FAQs.
  - Updated the README and deployment documentation to clarify the product page, hosted preview, and project status.
- **Files touched:** `docs/index.html`, `docs/styles.css`, `README.md`, `DEPLOYMENT.md`, `EXCHANGE_FLOOR.md`
- **Decisions and why:** Kept discovery claims anonymized and qualified; did not imply customer adoption or present unbuilt roadmap items as available features.
- **Gotchas:** The hosted URL is a trial preview, not an approved production service; payment processing and paid plans are not available.
- **Open follow-ups:** None.
- **Verification:** `npm run lint`, `npm test` (52 passed, 2 todo), and `npm run build` passed. After CI found a critical Next.js advisory, upgraded Next.js and its ESLint config to 16.4.2 and updated patched Prisma transitive dependencies; `npm audit --audit-level=critical` passed (0 critical; 5 high remain in the ESLint dependency chain). `git diff --check` passed; responsive checks passed at 320, 390, 800, and 1440px in light and dark modes.

### 2026-10-22 UTC: Deploy staging automatically on every merge to dev

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#30 / PR pending
- **Branch:** `feature/30-deploy-staging-on-merge`
- **What the agent did:** Added `.github/workflows/deploy-staging.yml`: on every push to `dev` (or by hand), it applies migrations, deploys to Vercel with a token (`vercel deploy --prod`), then checks `STAGING_URL/login` shows Elevate's login form. Removed `migrate-staging.yml`, which it replaces. `npm run staging:setup` now prints the GitHub secrets to add. Updated `DEPLOYMENT.md` and `CONTRIBUTING.md`.
- **Files touched:** `.github/workflows/deploy-staging.yml`, `.github/workflows/migrate-staging.yml` (removed), `scripts/staging-setup.mjs`, `DEPLOYMENT.md`, `CONTRIBUTING.md`
- **Decisions and why:** Deploy from GitHub Actions with a Vercel token rather than Vercel's GitHub integration: no organization app to approve, it keeps working on Vercel's free plan if the repo goes private (#71), and migrations run before the new code is deployed instead of racing Vercel's build.
- **Gotchas:** Until the `staging` environment has all four secrets, the workflow prints which are missing and deploys nothing. The Vercel project must not also be connected to the repository, or every merge deploys twice.
- **Open follow-ups:** Add the secrets once the team-owned Vercel and Supabase accounts exist; the first merge after that is the workflow's real test.
- **Verification:** `npm run lint` clean; workflow YAML parses; the skip step tested with none, some and all secrets set; the login check tested against Elevate's login (passes) and a stand in for Vercel's login page (fails with the protection hint); setup script dry run with a stand in Vercel CLI prints the ids from `.vercel/project.json`. The deploy step itself needs a real token and could not run here.

### 2026-10-21 08:00 UTC: Trial deploy on Supabase and Vercel; fixes it found

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#42 / PR pending
- **Branch:** `feature/42-staging-deployment`
- **What the agent did:** Guided a trial deploy with `npm run staging:setup` to a Supabase project in Canada (Central) and a Vercel project on @guerrerj's own free accounts, fictional data only. Fixed what the trial found: `engines.node` 24.x (Vercel builds refused Node 20); `vercel.json` with `framework: nextjs` (a project made by `vercel project add` built as a static site, every page 404); the script now tests the public production alias, checks `/login` is Elevate's form, and installs the test browser.
- **Files touched:** `package.json`, `package-lock.json`, `vercel.json`, `scripts/staging-setup.mjs`, `DEPLOYMENT.md`
- **Decisions and why:** The trial lives on personal accounts; the team decides in #30 whether it becomes staging or is rebuilt on shared accounts.
- **Gotchas:** `vercel link` appends `.vercel` and `.env*` to `.gitignore`; discard that, since `.env*` would hide `.env.example`. Vercel puts each deployment's own URL behind its login; the production alias is public. On Windows PowerShell, use `npm.cmd` and `npx.cmd` if script execution is blocked.
- **Open follow-ups:** Reset the trial database password (it was shared in a chat). Hosting decision and shared accounts (#30).
- **Verification:** Migrations applied to the hosted database (3 of 3); seed 89 climbers; Vercel build with Next.js 16.4 on Node 24; `E2E_BASE_URL=https://elevate-trial.vercel.app npm run test:e2e`: 10 passed, 2 skipped (the permission tests need a local build).

### 2026-10-21 06:15 UTC: Staging setup script

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#42 / PR pending
- **Branch:** `feature/42-staging-deployment`
- **What the agent did:** Added `scripts/staging-setup.mjs` (`npm run staging:setup`): migrate, seed, Vercel login and link, set the six variables, `vercel deploy --prod`, health check of `/login`, optional end to end run against the URL and reseed. Documented in `DEPLOYMENT.md` and the README.
- **Files touched:** `scripts/staging-setup.mjs`, `package.json`, `DEPLOYMENT.md`, `README.md`
- **Decisions and why:** Vercel CLI pinned to 63.1.2. Secrets reach child processes through their environment or stdin, never the command line, and are never printed. One prompt reader per question, closed before any Vercel command runs, so it doesn't compete with the CLI's own prompts. Deploys with `--prod` because preview links sit behind Vercel's login by default.
- **Gotchas:** `VERCEL_CLI` overrides the Vercel command, which is how the script was tested without an account.
- **Open follow-ups:** First real run against Supabase and Vercel.
- **Verification:** `npx eslint` clean on the script. Dry run with a stand in Vercel CLI and a local production build: six variables set (password only through stdin, `?pgbouncer=true` appended), deploy, health check, end to end 10 passed and 2 skipped, reseed, exit 0. Refusals checked: direct connection URL, `[YOUR-PASSWORD]`, `APP_ENV=production`, missing answer, failed migration. The migration step itself could not run here (Prisma's engine download is blocked in this sandbox).

### 2026-10-21 05:30 UTC: Deployment docs fixed for Supabase's IPv4 limits; .vercelignore

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#42 / PR pending
- **Branch:** `feature/42-staging-deployment`
- **What the agent did:** `DEPLOYMENT.md` and `.env.example` now use Supabase's session pooler (port 5432) for migrations and seeding instead of the direct connection; added PowerShell syntax and a "Trial deploy from your machine" section; added `.vercelignore` so the Vercel CLI doesn't upload `.env`.
- **Files touched:** `DEPLOYMENT.md`, `.env.example`, `.vercelignore`
- **Decisions and why:** Supabase's direct connection is IPv6 only (IPv4 needs the paid add-on), and GitHub Actions is IPv4 only, so `STAGING_DIRECT_URL` as written would have failed in `migrate-staging.yml`. The Vercel CLI's default ignore list skips `.env.local` but not `.env`.
- **Gotchas:** The app's `DATABASE_URL` stays the transaction pooler (port 6543). The pg adapter uses unnamed statements by default, which the transaction pooler supports.
- **Open follow-ups:** Trial deploy following the new section, before the PR merges.
- **Verification:** Docs only; checked against Supabase's IPv4 and IPv6 compatibility guide and Vercel's ignored files list.

### 2026-10-20 22:40 UTC: Server action permission test; scan load and burst measurements

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#43 (under #30); findings for #34 and #38 / PR pending
- **Branch:** `feature/42-staging-deployment`
- **What the agent did:**
  - Added `e2e/server-actions-auth.spec.ts`: calls `checkInClimber` and `signWaiver` through the public `/join` page with no login. Both run today, so the tests are marked `test.fail` and point at #34.
  - Measured the QR scan path locally (not committed; numbers below).
- **Files touched:** `e2e/server-actions-auth.spec.ts`
- **Decisions and why:** Recorded the gap as an expected failure instead of adding permission checks, because roles belong to #34 and sign in to #33. When the checks land, CI goes red on these tests until the `test.fail` marker is removed.
- **Gotchas:**
  - Next.js bundles every export of a `"use server"` file into each page that imports it. `/join` imports `features/climbers/actions.ts`, so `checkInClimber`, `signWaiver`, `createClimberAtDesk` and `updateClimber` can all be called through `/join`, which the proxy does not guard. Permission checks must live inside each action, not only in `proxy.ts`.
  - In demo mode the session cookies hold plain values (`elevate_mock_desk`, the climber id in `elevate_mock_user`), so anyone can set them by hand. Acceptable on staging with fictional data only.
  - A desk shows one scan at a time and stops polling while the popup is open. Scans older than `SCAN_TTL_MS` (2 minutes) are dropped without a log line. Burst runs, one desk: a group of 4 at 10 s each waited 7 to 40 s; 8 at 20 s each, 2 never shown; 12 at 15 s each, 5 never shown. Two desks showed all 12, longest wait 90 s.
  - Polling capacity on a 2 CPU container: 364 polls a second at 50 concurrent callers, p95 173 ms, no errors; one desk polls every 2.5 s, so capacity is not the limit.
- **Open follow-ups:** #34: permission check in every server action. #38: show how many scans are waiting, take the next scan as soon as the popup closes, log expired scans, and tell the climber if the desk hasn't seen them.
- **Verification:** `npm run lint` clean; `npx tsc --noEmit` clean; `npm run test:e2e` 12 passed (the two new tests fail as expected; with the marker removed they fail because the action ran).

### 2026-10-20 21:45 UTC: Accessibility tests, dependency audit in CI, Vitest 4.1

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#43 (under #30) / PR pending
- **Branch:** `feature/42-staging-deployment`
- **What the agent did:**
  - Upgraded Vitest from 3.2 to 4.1.12; 3.2 brought in a critical (tinypool) and a moderate (@vitest/mocker) advisory.
  - Added `e2e/accessibility.spec.ts`: axe (WCAG 2.1 A and AA) on login, join, the climber screens and the desk screens, in light and dark mode, with phone and laptop sizes.
  - CI fails on any critical advisory (`npm audit --audit-level=critical`).
- **Files touched:** `package.json`, `package-lock.json`, `e2e/accessibility.spec.ts`, `.github/workflows/ci.yml`, `README.md`
- **Decisions and why:** The audit gate is set at critical, not high, because `dev` already has 9 high advisories, all in build and CLI tooling (Prisma CLI, eslint-config-next); a high gate would fail every PR until those packages are upgraded in their own PR.
- **Gotchas:** Axe finds roughly a third of accessibility problems; keyboard use and screen readers still need a manual check.
- **Open follow-ups:** Upgrade Prisma CLI and eslint-config-next to clear the 9 high advisories, then raise the gate to high.
- **Verification:** `npm run lint` clean; `npx tsc --noEmit` clean; `npm test` 52 passed, 2 todo; `npm run test:db` 7 passed; `npm run build` passed; `npm run test:e2e` 10 passed (4 demo flow, 6 accessibility, no violations on 9 screens in either mode); `npm audit`: 0 critical, 0 moderate, 9 high (same as `dev`).

### 2026-10-20 14:30 UTC: Error pages, server error logging and event logs

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#42 / PR pending
- **Branch:** `feature/42-staging-deployment`
- **What the agent did:**
  - Added `src/app/error.tsx` and `src/app/global-error.tsx`: a "Something went wrong" page with Try again and the error code (digest), using the style guide components.
  - Added `src/instrumentation.ts`: `onRequestError` logs every server error as one JSON line, without the query string.
  - Added `src/lib/log.ts` and event logs for login, climber created or updated, invalid forms (field names only), waiver signed, scan saved and taken (with `waitMs`), and check in saved or refused (with a reason code).
  - `takeScan` now also returns `scannedAt`, for `waitMs`.
- **Files touched:** `src/app/error.tsx`, `src/app/global-error.tsx`, `src/instrumentation.ts`, `src/lib/log.ts`, `src/features/climbers/actions.ts`, `src/features/check-ins/actions.ts`, `src/features/check-ins/scan-store.ts`, `src/features/auth/actions.ts`, `DEPLOYMENT.md`
- **Decisions and why:** Plain JSON lines on stdout, no logging library or account, so Vercel's log viewer can search them now and a monitoring service can be added in `instrumentation.ts` later. Log lines carry ids and reason codes only, never personal data.
- **Gotchas:** None known.
- **Open follow-ups:** Error monitoring service and uptime check, with the staging accounts (#30).
- **Verification:** `npm run lint` clean; `npx tsc --noEmit` clean; `npm test` 52 passed, 2 todo; `npm run test:db` 7 passed; `npm run build` passed; `npm run test:e2e` 4 passed, and the server output had the expected events with no names, phones or emails; stopping Postgres while the desk was open showed the error page, its error code matched the `digest` of the `server_error` log line, and Try again recovered once Postgres was back; checked in light and dark mode.

### 2026-10-20 06:45 UTC: Ready the app for hosted staging; tests and CI release gate

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#42 and #43 (under #30) / PR pending
- **Branch:** `feature/42-staging-deployment`
- **What the agent did:**
  - Removed three blockers to hosting: fonts are bundled (`next/font/local`) instead of fetched from Google at build time; pending QR scans are stored in a new `QrScan` table instead of server memory; the demo login works in a deployed build when `DEMO_MODE="true"` (staging only; `APP_ENV="production"` always turns it off).
  - Brought in Tyler's demo login fix from the deleted `fix/33-demo-login-redirect` branch (separate desk and climber cookies).
  - Added Vitest unit tests (status, validation, phone, fuzzy search, busyness), database tests for the scan store, and a Playwright end to end test of the demo flow.
  - CI: unit tests in `check`; new `e2e` job with Postgres (migration drift check, `prisma migrate deploy`, seed, database tests, build, Playwright); a check that fails pull requests that edit existing migrations; a workflow that applies migrations to staging from `dev` once `STAGING_DIRECT_URL` exists.
  - `DEPLOYMENT.md` runbook; migration rules in `CONTRIBUTING.md`; `QrScan` in `prisma/DATABASE.md`; `.gitattributes` forces LF.
- **Files touched:** `src/features/check-ins/scan-store.ts`, `src/features/check-ins/actions.ts`, `src/features/auth/demo-mode.ts`, `src/features/auth/session.ts`, `src/proxy.ts`, `src/components/ui/theme/fonts.ts`, `prisma/schema.prisma`, `prisma/migrations/20261020070000_qr_scan/`, `prisma/seed.ts`, `prisma7.config.ts`, `.github/workflows/`, `vitest.config.ts`, `playwright.config.ts`, `e2e/`, `*.test.ts`
- **Decisions and why:** Scans claimed with a conditional update (`takenAt` still empty), so two desks never show the same scan. Demo mode is an explicit environment flag rather than a `NODE_ENV` check, so staging can demo before real sign-in (#33) and production can never. Prisma CLI uses `DIRECT_URL` (direct connection) and the app `DATABASE_URL` (pooler), per Prisma's Supabase guide.
- **Gotchas:** The native Prisma schema engine couldn't be downloaded in the agent's environment, so the `QrScan` migration was checked with Prisma's own WebAssembly schema engine (`@prisma/schema-engine-wasm`, the same engine commit as the installed CLI): its diff from the previous `schema.prisma` to the new one is identical to `migration.sql`, apart from the row level security line added by hand as in the init migration. CI's `prisma migrate diff --exit-code` step checks it again with the native engine. All app, seed and test database access goes through the Prisma client; the only `psql` call creates CI's empty shadow database. The seed now deletes `QrScan` rows before climbers.
- **Open follow-ups:** Create the Vercel and Supabase projects and secrets (team decision in #30). Sound-alike name search (jeff finds Geoff) and a desk day pass are recorded as known gaps in the tests (proposal #55, D1 and D2). Remove `demo-mode.ts` when #33 lands.
- **Verification:** `npm run lint` clean; `npx tsc --noEmit` clean; `npm test` 46 passed, 2 todo; `npm run test:db` 6 passed; `npm run build` passed with no network access to Google Fonts; `npm run test:e2e` 4 passed against `next start` with `DEMO_MODE="true"`; a production build without `DEMO_MODE`, and with `APP_ENV="production"`, refuses the demo login.

### 2026-10-16 03:47 UTC: Update product page logo and app screenshots

- **Developer:** @ekamgill
- **AI tool / model:** Copilot CLI
- **Issue / PR:** StealthStartup-455/elevate-docs#24 / StealthStartup-455/elevate#25
- **Branch:** `feature/24-update-logo-product-page`
- **What the agent did:**
  - Replaced the hand-drawn product-page logo with the app's current mark and wordmark.
  - Replaced the front-desk and member screenshots with fresh captures of the current app styling and demo data.
  - Removed the decorative star from the bottom of the page.
- **Files touched:** `docs/index.html`, `docs/styles.css`, `docs/assets/`, `EXCHANGE_FLOOR.md`
- **Decisions and why:** Used the same transparent logo masks and brand colors as the app; retained existing product-page layouts while updating their screenshots.
- **Gotchas:** The screenshots are local-app captures using fictional demo data.
- **Open follow-ups:** None.
- **Verification:** `npm run lint`, `npm run build`, and `git diff --check` passed; local page and logo/screenshot assets returned HTTP 200; Chrome confirmed all screenshots load, no mobile horizontal overflow at 390px, and no decorative star remains; desktop and mobile page previews inspected.

### 2026-10-15 23:00 UTC: Add the Elevate logo

- **Developer:** @Scott-Squires
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#22 / no PR yet
- **Branch:** `feature/22-logo-first-pass` (branched from `feature/16-style-guide`, which must merge first)
- **What the agent did:**
  - Cut the logo artwork into three transparent masks (mountain, wordmark, tagline) in `public/brand/`.
  - Added `src/components/ui/Logo.tsx`: `variant="inline"` (mountain + wordmark) and `variant="full"` (stacked, with tagline).
  - Full logo above the login form on `/` (replaces the "Elevate" text header) and `/login`; inline logo at the start of the `/desk` and `/me` nav bars, linking to each section's home.
  - Switched the `/desk` and `/me` nav bars from `items-center` to `items-baseline` so the wordmark sits on the same line as the tab labels.
  - Replaced `src/app/favicon.ico` and added `src/app/icon.png` and `src/app/apple-icon.png`, all from the teal mountain.
  - Listed `Logo` in `STYLE_GUIDE.md` and `src/components/ui/README.md`.
- **Files touched:** `src/components/ui/Logo.tsx`, `public/brand/*.png`, `src/app/{favicon.ico,icon.png,apple-icon.png}`, `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/desk/layout.tsx`, `src/app/me/layout.tsx`, `STYLE_GUIDE.md`, `src/components/ui/README.md`
- **Decisions and why:** The logo parts are CSS masks painted with `primary.main` (mountain) and `text.primary` (letters), so it follows light/dark mode and needs no raw colors. The source artwork's teal is the action teal, so the mountain uses it; the style guide notes this is brand, not an action.
- **Gotchas:** The masks were cut from a raster PNG, not vector art. If a vector (SVG) version of the logo turns up, swap the files in `public/brand/` and keep the same aspect ratios in `Logo.tsx`.
- **Open follow-ups:** None.
- **Verification:** `npm run lint` clean; `npm run build` succeeded; checked `/` and `/desk` screenshots in light and dark mode in headless Chrome.
### 2026-10-15 18:00 UTC: Membership status ignores passes that have not started

- **Developer:** @agamkamran02
- **AI tool / model:** Claude Code (claude-sonnet-5-5)
- **Issue / PR:** StealthStartup-455/elevate-docs#42 (follow-up to #20) / no PR yet
- **Branch:** `fix/42-membership-status-future-pass`
- **What the agent did:**
  - Fixed a review finding on #20: membership status was read from the pass with the newest `startsAt`, so a renewal bought early (starting in the future) made the climber show as "none" and blocked check-in.
  - `summarizeMembership` now takes all membership passes, ignores any that have not started, and uses the newest one that has.
- **Files touched:** `src/features/climbers/status.ts`, `src/features/climbers/queries.ts`
- **Decisions and why:** The query now loads every membership pass for the climber instead of one, so the filter can run on the date. A climber has few passes, so this is cheap. A future pass does not change `renewsOn`; it still shows when the current pass ends.
- **Gotchas:** None.
- **Open follow-ups:** None.
- **Verification:** `npx tsc --noEmit` and `npx eslint src` clean. Six cases checked with `summarizeMembership`: current + early renewal is active, only a future pass is none, no passes is none, expired + future is expired, paused + future is paused.

### 2026-10-15 02:20 UTC: Separate pricing from FAQ section

- **Developer:** @ekamgill
- **AI tool / model:** Copilot CLI
- **Issue / PR:** StealthStartup-455/elevate-docs#24 / no PR yet
- **Branch:** `feature/24-product-page`
- **What the agent did:**
  - Added vertical space below the pricing card so it is visually distinct from the FAQ section.
- **Files touched:** `docs/styles.css`, `EXCHANGE_FLOOR.md`
- **Decisions and why:** Used section margin rather than changing either section's layout or content.
- **Gotchas:** None.
- **Open follow-ups:** None.
- **Verification:** `git diff --check` passed; Chrome measured a 48px gap between pricing and FAQ at 1425px and 390px viewport widths; page returned HTTP 200.

### 2026-10-15 02:15 UTC: Remove climber photo and pricing placeholder

- **Developer:** @ekamgill
- **AI tool / model:** Copilot CLI
- **Issue / PR:** StealthStartup-455/elevate-docs#24 / no PR yet
- **Branch:** `feature/24-product-page`
- **What the agent did:**
  - Removed the climber photo and its responsive styles.
  - Removed the “Not set yet.” pricing heading.
  - Removed the hero tagline badge at the developer's request.
- **Files touched:** `docs/index.html`, `docs/styles.css`, `docs/assets/climber.jpg`, `EXCHANGE_FLOOR.md`
- **Decisions and why:** Removed the badge instead of replacing its wording, as requested.
- **Gotchas:** None.
- **Open follow-ups:** None.
- **Verification:** `git diff --check` passed; no pricing placeholder, climber-photo, or hero badge references remain.

### 2026-10-15 02:05 UTC: Replace hero climber illustration with photo

- **Developer:** @ekamgill
- **AI tool / model:** Copilot CLI
- **Issue / PR:** StealthStartup-455/elevate-docs#24 / no PR yet
- **Branch:** `feature/24-product-page`
- **What the agent did:**
  - Removed the hero screenshot caption and replaced the custom climber illustration with a cropped climber photo overlapping the screenshot.
  - Replaced “Built for the whole gym” with “One place for staff & members.”
  - Adjusted the photo and sticker at mobile/tablet breakpoints.
- **Files touched:** `docs/index.html`, `docs/styles.css`, `docs/assets/climber.jpg`, `EXCHANGE_FLOOR.md`
- **Decisions and why:** Use a real climbing photo rather than abstract shapes; keep the badge short and explicitly about staff and members.
- **Gotchas:** None.
- **Open follow-ups:** None.
- **Verification:** `git diff --check` passed; local page and climber asset returned HTTP 200; Chrome previews checked at 1425px and 390px; mobile DOM reported 390px document width with no horizontal page overflow.

### 2026-10-15 01:55 UTC: Refine screenshot labels and climber illustration

- **Developer:** @ekamgill
- **AI tool / model:** Copilot CLI
- **Issue / PR:** StealthStartup-455/elevate-docs#24 / no PR yet
- **Branch:** `feature/24-product-page`
- **What the agent did:**
  - Removed the staff/member number labels above the product screenshots.
  - Moved the climber illustration fully below the hero screenshot and refined its limbs, joints, and pose.
- **Files touched:** `docs/index.html`, `docs/styles.css`, `EXCHANGE_FLOOR.md`
- **Decisions and why:** Kept the illustration as a small inline SVG, with connected, articulated limbs; screenshot content remains unobstructed on desktop and mobile.
- **Gotchas:** None.
- **Open follow-ups:** None.
- **Verification:** Local page returned HTTP 200; Chrome checks passed at 390px and 1425px with the climber below the screenshot, number labels absent, no horizontal overflow, and no broken images; static links/assets and `git diff --check` passed.

### 2026-10-15 01:44 UTC: Refine product page copy and layout

- **Developer:** @ekamgill
- **AI tool / model:** Copilot CLI
- **Issue / PR:** StealthStartup-455/elevate-docs#24 / no PR yet
- **Branch:** `feature/24-product-page`
- **What the agent did:**
  - Replaced the generic hero headline with product-specific copy for staff and members.
  - Removed the numbered trust strip and the standalone use-case and trust sections.
  - Simplified pricing to a compact status, disclosure and contact link; updated the closing CTA to “Help shape a better climbing day.”
  - Redrew the climber illustration with connected limbs and a cohesive climbing pose.
- **Files touched:** `docs/index.html`, `docs/styles.css`, `EXCHANGE_FLOOR.md`
- **Decisions and why:** Kept concise early-preview and fictional demo-data disclosures so the page does not suggest real customers, available paid plans or production data.
- **Gotchas:** None.
- **Open follow-ups:** None.
- **Verification:** Local static server returned HTTP 200; Chrome checks passed at 390px and 1425px with no horizontal overflow and no broken images; `git diff --check` passed.

### 2026-10-14 21:17 UTC: GitHub Pages product page

- **Developer:** @ekamgill
- **AI tool / model:** Copilot CLI
- **Issue / PR:** StealthStartup-455/elevate-docs#24 / no PR yet
- **Branch:** `feature/24-product-page`
- **What the agent did:**
  - Added a responsive, standalone product page in `docs/` with use cases, real app screenshots, product status and privacy notes, pricing transparency, FAQs and GitHub calls to action.
  - Added a GitHub Pages workflow that deploys `docs/` from `dev`, and documented the one-time Pages setup.
- **Files touched:** `docs/index.html`, `docs/styles.css`, `docs/assets/*.png`, `.github/workflows/deploy-pages.yml`, `README.md`, `EXCHANGE_FLOOR.md`
- **Decisions and why:** Kept the marketing site static and separate from the authenticated Next.js app so GitHub Pages can serve it directly. Screenshots are from the running app with fictional demo data; no customer testimonials or prices were invented.
- **Gotchas:** GitHub Pages must be enabled with **Settings → Pages → GitHub Actions** before the deployment workflow can publish.
- **Open follow-ups:** Enable the Pages source in repository settings and merge the page to `dev` to deploy it.
- **Verification:** `npm run lint` passed; `npm run build` passed; static link/asset check passed (5 anchors, 6 local references); Chrome mobile (390px) and desktop (1425px) checks passed with no horizontal overflow or broken images; `git diff --check` passed.
### 2026-10-15 00:30 UTC: Manual check in dialog on the front desk

- **Developer:** @agamkamran02
- **AI tool / model:** Claude Code (claude-sonnet-5-5)
- **Issue / PR:** StealthStartup-455/elevate-docs#42 / no PR yet
- **Branch:** `feature/42-connect-frontend-and-backend`
- **What the agent did:**
  - Added a "Manual check in" button next to "Add climber" on `/desk`. It opens a dialog with fuzzy search (same matcher as the climbers list), a list of matches, and a view of the selected climber's membership and waiver with a "Manually check in" button.
  - New server action `checkInClimber` saves a `CheckIn` row (`FRONT_DESK`). It refuses a waiver that is not valid, a membership that is not active, and a repeat within 2 hours.
  - The desk list and busyness count now include saved check-ins on top of the JSON mock.
- **Files touched:** `src/features/climbers/components/ManualCheckIn.tsx`, `ManualCheckInButton.tsx`, `actions.ts`, `queries.ts`, `src/features/analytics/queries.ts`, `src/app/desk/page.tsx`
- **Decisions and why:** Saved check-ins use the real clock, not the mock's fixed one, so they are cut off by the real 2 hour window and merged in newest first. The check rules follow `prisma/DATABASE.md` ("Checking someone in"); there is no staff override yet.
- **Gotchas:** This overlaps with `feature/36-check-in-front-desk` (Tyler). Whoever merges second should reconcile on `CheckIn` writes. `staffId` is not set until auth exists.
- **Open follow-ups:** Staff override for a missing waiver; punch card visits; set `staffId`; QR check in.
- **Verification:** `npx tsc --noEmit` and `npx eslint src` clean. Browser: fuzzy "tylr" finds Tyler Le, check in succeeds and the count goes 28 to 29, a demo account with a missing waiver is blocked, a repeat is refused.

### 2026-10-14 23:50 UTC: Connect the climbers and login screens to the database

- **Developer:** @agamkamran02
- **AI tool / model:** Claude Code (claude-sonnet-5-5)
- **Issue / PR:** StealthStartup-455/elevate-docs#42 / no PR yet
- **Branch:** `42-connect-frontend-and-backend` (created by @TylerLeHere; the name has no type prefix, so the branch-policy check may reject a PR from it)
- **What the agent did:**
  - Replaced the in-memory climber store with Prisma queries and actions on `Climber`, `Waiver` and `Pass`; removed `src/features/climbers/mock-data.ts`.
  - `prisma/seed.ts` now also seeds the busyness mock climbers, waivers and passes, and one demo account for every waiver x membership state (still in the database, same usernames).
  - The demo session cookie now lasts 30 days and holds the climber's database id; `/me` with no session redirects to `/`. Desk and `/me` URLs use database ids and survive restarts.
  - Check-in rows on `/desk` link to the real climber and show the live waiver status.
  - Added an optional email field to the sign up and desk forms (the schema has `email`).
- **Files touched:** `src/features/climbers/*` (queries, actions, status, phone, demo-accounts, types, validate), `src/features/auth/*` (session, mock-users, actions), `src/lib/gym.ts`, `prisma/seed.ts`, `prisma/schema.prisma`, new migration `pass_paused_at`, `prisma/DATABASE.md`
- **Decisions and why:**
  - Added `Pass.pausedAt` (migration `pass_paused_at`) because the design has paused memberships and the schema had no way to say so. Everything else is derived, see "How the app shows waiver and membership status" in `prisma/DATABASE.md`.
  - A waiver is valid for one year from `signedAt`; the schema has no expiry column.
  - `Climber.externalId` holds the busyness mock id (`climber-N`) or the demo username. It is a mock-only use of a column meant for Redpoint / Rock Gym Pro ids.
  - Check-ins stay on the JSON busyness mock for now; #36 (check-in) owns real `CheckIn` rows.
- **Gotchas:**
  - `npm run db:seed` resets the demo gym's climbers, so anyone added in the app is removed.
  - Existing sessions and bookmarked `climber-N` URLs stop working: ids are now UUIDs.
  - On Windows, Hyper-V can reserve ports 54245-54344, which breaks Supabase's default 543xx ports. Change them locally in `supabase/config.toml` and `.env` (not committed).
  - `DEV_AUTH_BYPASS="true"` is still needed to open `/desk` and `/me` locally, because the demo login does not create a Supabase session.
- **Open follow-ups:** Real auth (Supabase) in place of the demo cookie; set `createdByStaffId` from the logged-in staff member; real `CheckIn` rows (#36); a real waiver signing flow; buying and renewing memberships.
- **Verification:** `npx eslint .` clean, `npx tsc --noEmit` clean, `npm run build` passed, `npm run db:seed` seeds 89 climbers. Checked in a browser against local Supabase: login, waiver signing on `/me` and `/desk`, session across a new browser context, `/join` new member (no membership, Buy button), desk list and detail, check-in links.

### 2026-10-14 22:02 UTC: Style guide, MUI theme and design tokens

- **Developer:** @Scott-Squires
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate-docs#16 / (this PR)
- **Branch:** `feature/16-style-guide`
- **What the agent did:**
  - Added `STYLE_GUIDE.md` (rules, color research summary, tokens, components, page patterns) and a live `/style-guide` page.
  - Replaced the placeholder green theme: `src/components/ui/theme/` now holds `tokens.ts` (every color, size, radius and timing), `theme.ts` (MUI theme with hover, focus and density overrides), `mui-augment.d.ts` and `fonts.ts` (IBM Plex Sans and Mono replace Geist).
  - Added shared components: `LinkArrow`, `HelpTip`, `DisabledReason`, `StatusPill`, `KpiTile`, `ColorModeToggle`.
  - `globals.css` maps the tokens to Tailwind classes (`bg-surface`, `text-fg-muted`, `border-line`, `max-w-narrow`…) and removes Tailwind's own palette, type scale, radii and shadows.
  - Lint now rejects raw colors, Tailwind arbitrary values and Tailwind text-size, font-weight and palette classes in `src/`. Added a "UI and styling (mandatory)" section to `AGENTS.md`, a Cursor rule, a Copilot line and a PR checklist item.
- **Files touched:** `STYLE_GUIDE.md`, `src/components/ui/**`, `src/app/style-guide/*`, `src/app/{layout.tsx,globals.css,manifest.ts}`, `eslint.config.mjs`, `AGENTS.md`, `README.md`, `.cursor/rules/style-guide.mdc`, `.github/{copilot-instructions.md,pull_request_template.md}`; small edits in the existing screens listed under Gotchas.
- **Decisions and why:**
  - **MUI `primary` = actions (teal `#00615F`), `secondary` = navigation and settings (slate blue).** `palette.action` is MUI's own hover/disabled object, so "action" can't be a palette key. Links, tabs, toggles, checkboxes, switches and fields default to `secondary` in the theme.
  - **MUI spacing is now 4px** (was 8px) so `sx={{ p: 3 }}` and Tailwind `p-3` are the same 12px. MUI breakpoints now match Tailwind's (640/768/1024/1280).
  - **Built-in Typography variants are kept** (`h5`, `h6`, `body2`, `caption`…) and restyled to match the six new styles, because MUI's components and ~45 existing usages rely on them. New code uses `pageTitle`, `cardTitle`, `kpi`, `body`, `secondary`, `label`.
  - **Touch screens get 40px controls and 16px field text automatically** (`@media (pointer: coarse)`), so member pages work on phones without per-page sizes and iOS doesn't zoom on focus.
  - Light/dark uses MUI's `data-mui-color-scheme` attribute set by `InitColorSchemeScript` before first paint; Tailwind's `dark:` variant is wired to the same attribute. Default is the system setting.
  - The busyness heat map now shades `chart.now` (grey) instead of the primary colour: charts are data, and the action color is reserved for actions.
  - 2026-10-15: the action color changed from violet to teal `#00615F` at the developer's request. Teal sits close to success green for red-green color blind users, so status must keep its icon (`StatusPill`) and actions stay buttons.
- **Gotchas:**
  - Every existing numeric `sx` spacing value and `Stack spacing` was **doubled** to keep the old spacing under the 4px unit (for example `mb: 2.5` → `mb: 5`). The 7 `CardContent sx={{ p: { xs: 2, sm: 3 } }}` overrides were removed so cards use the 12px token. Files: `LoginForm`, `ClimberForm`, `ClimberTable`, `MembershipCard`, `WaiverStep`, `CustomerBusyness`, `FrontDeskBusyness`, `CheckInTable`, `BusynessHeatMap`, `ShowMore`, `join` and the `desk/climbers` pages. **If you add sx spacing from older code, halve-check it.**
  - Page titles (`<h1 className="text-2xl font-semibold">`) became `<Typography variant="pageTitle">`; `max-w-[560px]` became `max-w-narrow`; check-in and climber table names are now MUI links (slate blue); `--font-geist-mono` no longer exists, use `var(--font-mono)`.
  - `StatusPill` must stay a client component: MUI's Chip clones its icon, which breaks hydration when the icon comes from a Server Component.
  - `DemoQrCode` keeps its black-on-white colors on purpose, with `eslint-disable` comments explaining why.
  - 2026-10-15: merged `dev`. The new `ManualCheckIn` dialog (#42) got the same treatment: its `sx` spacing values were doubled, and its raw `rgba()` box shadow was removed so the dialog uses the theme's floating shadow. `/desk` keeps the `pageTitle` heading with the new "Manual check in" button beside "Add climber".
- **Open follow-ups:** move older screens to the six variant names, then remove the built-in variants from the Typography types; switch `WaiverBadge`, `BusynessLevelChip` and the check-in table's waiver chips to `StatusPill` so status always has its icon; replace `features/climbers/LinkButton` (navigation shown as a filled button) with `LinkArrow` or a text link; decide whether `ColorModeToggle` goes in the app header; lint does not check `sx` values or variant names yet.
- **Verification:** `npm run lint` passed with no warnings. `npm run build` passed with the CI placeholder env values (`/style-guide` builds as static). In `next dev` (with `DEV_AUTH_BYPASS`): `/style-guide`, `/desk`, `/me` and `/join` checked at 1280px and 375px, light and dark; measured buttons 24/28/40px, fields 28px (40px with 16px text on touch), labels centred, no horizontal overflow at 375px, no console errors after the `StatusPill` fix. Every text color pair in `tokens.ts` passes WCAG AA in both themes (lowest 4.80:1). Not checked: real devices, Safari.

### 2026-10-14 03:40 UTC: Database guide (prisma/DATABASE.md)

- **Developer:** @TylerLeHere
- **AI tool / model:** Claude Code
- **Issue / PR:** StealthStartup-455/elevate-docs#21 / no PR yet
- **Branch:** `feature/21-build-a-mock-database`
- **What the agent did:**
  - Added `prisma/DATABASE.md`: how the database works, the six tables, the one-gym rule, the check-in steps, every column, a Prisma code example and the database commands.
  - Linked it from the main `README.md` under Scripts.
  - Merged the latest `dev` into this branch (no conflicts) so this log and the guide sit on current code.
- **Files touched:** `prisma/DATABASE.md`, `README.md`, `EXCHANGE_FLOOR.md`
- **Decisions and why:** The guide describes the schema exactly as committed by @Khanh150104 in `7117344`. Diagrams are plain text, not Mermaid, so they read the same in every Markdown viewer.
- **Gotchas:** The guide must change with the schema. Whoever edits `schema.prisma` updates `prisma/DATABASE.md` in the same PR. `package-lock.json` matches `dev` again after the latest merge.
- **Open follow-ups:** Open the PR into `dev`. `prisma/seed.ts` is still empty. The screens on `dev` show waiver expiry, paused memberships and per-gym busyness limits, which the schema has no columns for.
- **Verification:** `npm run lint` passed and `npm run build` passed on this branch after merging `dev`. Docs-only change; no code or schema changed.

### 2026-10-13 00:00 UTC: Hard-coded demo login, demo accounts, waiver signing, membership states

- **Developer:** @agamkamran02
- **AI tool / model:** Claude Code (claude-sonnet-5-5)
- **Issue / PR:** StealthStartup-455/elevate-docs#41 / (this PR)
- **Branch:** `feature/41-account-login` (built on `feature/34-account-creation-front-desk`)
- **What the agent did:**
  - Home page (`/`) and `/login` show a static login card: username and password are the same string, taken from the mock climbers (`first.last`), plus `desk` for the front desk. "Join the gym" sits under it; an "i" icon lists demo accounts.
  - Twelve demo accounts (`demo-<waiver>-<membership>`) cover waiver valid/expired/missing x membership none/active/paused/expired.
  - Log out button at the top right of the `/me` and `/desk` layouts.
  - `/me` shows the logged-in climber (cookie), membership and waiver expiry lines, and Sign waiver / Buy / Renew buttons by status.
  - "Sign a waiver now" runs a 5 s spinner, then marks the waiver valid for a year (desk climber page, `/me`, `/join`).
  - New accounts start with membership `none` and a Buy membership button.
  - `/me` and the desk climber page are centered on desktop; the check-in table reads live waiver status.
- **Files touched:** `src/features/auth/*`, `src/app/{page,login/page}.tsx`, `src/app/{me,desk}/layout.tsx`, `src/app/me/page.tsx`, `src/app/desk/climbers/[climberId]/page.tsx`, `src/features/climbers/*`, `src/features/analytics/components/FrontDeskBusyness.tsx`
- **Decisions and why:**
  - The login is hard-coded as the issue asks. The action refuses to run when `NODE_ENV` is `production`, and `getMyMembership` ignores the cookie in production.
  - It sets a cookie only; it does not create a Supabase session, so `/me` and `/desk` still need `DEV_AUTH_BYPASS="true"` locally. `proxy.ts` is unchanged on purpose.
  - Demo accounts use ids `climber-9001` and up so they never clash with the busyness mock climbers.
  - Climber mock data lives in `features/climbers/mock-data.ts` (seeded from the busyness mock) and is mutable in memory; it resets on server restart.
- **Gotchas:** every 7th mock climber is paused and every 10th expired so those states are visible. Buy and Renew membership are disabled placeholders.
- **Open follow-ups:** replace the demo login with Supabase auth; real memberships and payments; wire "Look at waiver" to the waivers feature; real next page after waiver signing.
- **Verification:** see the PR description.

### 2026-10-13 18:55 UTC: Fuzzy desk search, home page links, membership card, simpler member busyness

- **Developer:** @sethmess
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** sprint board #38 and #37 / #11
- **Branch:** `feature/38-busyness-tracker`
- **What the agent did:**
  - Front desk search is now fuzzy (`src/lib/fuzzy.ts`): typos, skipped letters, any word order, accents. Results rank by best match while searching; the column headers still override.
  - Home page (`/`) has buttons to the member dashboard and the front desk.
  - `/me` starts with a membership card (plan, renewal, waiver status, demo QR code), following the customer dashboard mock.
  - Simplified the member busyness card: today's row only, with the full week behind "Show full week".
- **Files touched:** `src/lib/fuzzy.ts`, `src/features/analytics/components/{CheckInTable,CustomerBusyness,BusynessHeatMap,ShowMore}.tsx`, `src/features/climbers/{queries.ts,README.md}`, `src/features/climbers/components/{MembershipCard,DemoQrCode}.tsx`, `src/app/page.tsx`, `src/app/me/page.tsx`
- **Decisions and why:**
  - `fuzzyScore` is in `src/lib/` (not analytics) so climber lookup can reuse it. Number-only search words match the phone; other words fuzzy-match the name.
  - **The QR code is fake on purpose** (`DemoQrCode`): it has QR corner squares but does not scan. The real code format belongs to the check-in ticket.
  - The membership card is in `features/climbers/` with its own mock `getMyMembership()`. It's outside #37/#38, but added here at the developer's request.
- **Gotchas:** `/me` and `/desk` still need `DEV_AUTH_BYPASS="true"` locally, including when reached from the new home page buttons.
- **Open follow-ups:** real membership query once auth exists; replace `DemoQrCode` with a real QR or barcode; unit tests for `fuzzyScore` once a test runner exists.
- **Verification:** `npm run lint` passed with no warnings; `npm run build` passed (`/` static, `/desk` and `/me` partial prerenders). `/`, `/me` and `/desk` return 200 in `next dev` with the bypass on. Screenshots checked at 390 px for `/` and `/me`. Sample fuzzy queries checked with `tsx` ("jmie", "chen jam", "jamei", "tremv", "nguyn" all find the right person; "xyz" finds nothing). The search box, sorting and "Show full week" toggle were not clicked through in a browser.

### 2026-10-13 17:44 UTC: Busyness tracker review changes: fixed mock scenarios, heat map, desk search

- **Developer:** @sethmess
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** sprint board #38 and #37 / #11
- **Branch:** `feature/38-busyness-tracker`
- **What the agent did:**
  - Replaced the "now minus minutes" mock with fixed JSON scenarios (`quiet` 8, `moderate` 28, `busy` 55 climbers) built around one reference time, picked with `MOCK_BUSYNESS_SCENARIO`. Added `npm run mock:busyness` to regenerate them with any counts.
  - Added a typical-week heat map (`BusynessHeatMap`, `getWeeklyBusyness`) to both dashboards, with the current hour outlined.
  - Restyled the customer card after the customer dashboard mock attached to PR #11.
  - Front desk: search (name or phone, partial and any order), waiver status filter with counts, and sorting by name or time (`CheckInTable`, client component). Two-column layout on wide screens.
- **Files touched:** `scripts/generate-busyness-mock.ts`, `src/features/analytics/{mock-data,queries,busyness,types}.ts`, `src/features/analytics/mock/*.json`, `src/features/analytics/components/{BusynessHeatMap,CheckInTable,CustomerBusyness,FrontDeskBusyness,BusynessLevelChip}.tsx`, `src/components/ui/ThemeRegistry.tsx`, `src/app/{desk,me}/layout.tsx`, `.env.example`, `package.json`
- **Decisions and why:**
  - **Mock clock:** queries get "now" from `busynessNow()`, which returns the scenario's fixed reference time. The real version returns `new Date()`; nothing else needs to change.
  - **Heat map is in scope now:** the original brief listed heat maps as out of scope, but the PR review asked for one. The heat map currently reads mock `week.json`; the real version averages the active count per hour over recent weeks.
  - **Level labels are now Quiet / Moderate / Busy** (to match the mock's legend) in both views. The internal values are still `low | medium | high`.
  - **Theme primary colour** is the mock's green (`#24705c`, lighter in dark mode) until the style guide lands.
  - The desk table rows are formatted on the server, so only plain strings and numbers cross into the client component. The customer view still gets counts only.
- **Gotchas:**
  - The busyness page always shows 6:30 PM on Thursday because of the mock clock. That's intended.
  - `mock/*.json` is generated; edit the script or rerun it rather than hand-editing (hand edits are fine but get overwritten on regenerate).
- **Open follow-ups:** the same follow-ups as the 2026-10-11 entry, plus: replace `getWeeklyBusyness` with a real query; full restyle once the style guide is done.
- **Verification:** `npm run lint` passed with no warnings; `npm run build` passed (`/desk` and `/me` as partial prerenders). All three scenarios render on `/desk` and `/me` in `next dev` at 390 px and 1440 px (8, 28 and 55 check-ins → Quiet, Moderate, Busy). `npm run mock:busyness` run twice gives byte-identical files.
### 2026-10-13 00:00 UTC: Front desk account creation and climber list

- **Developer:** @agamkamran02
- **AI tool / model:** Claude Code (claude-sonnet-5-5)
- **Issue / PR:** StealthStartup-455/elevate-docs#34 / (this PR)
- **Branch:** `feature/34-account-creation-front-desk` (built on `feature/33-account-creation-customer`)
- **What the agent did:**
  - Added `/desk/climbers` (all climbers from the mock data, each selectable), `/desk/climbers/new` and `/desk/climbers/[climberId]` (edit details).
  - Added a placeholder, disabled "Look at waiver" button on the climber page.
  - Added `createClimberAtDesk` and `updateClimber` server actions, `queries.ts` and `WaiverBadge`.
  - Made the desk and member nav wrap on narrow screens.
  - Merged `dev` (PR #11) and aligned with it: MUI cards, tables and chips (same waiver colours as the check-in table), an "Add climber" button on `/desk`, and check-in table names that open the climber.
  - Climber mock data is now seeded from the busyness mock (same ids, names, phones, waiver status), so the desk list and the check-in table agree; `getMyMembership` (Jordan, `climber-3`) matches the same person. Dates of birth are generated from the id.
- **Files touched:** `src/features/climbers/{actions,queries}.ts`, `src/features/climbers/components/WaiverBadge.tsx`, `src/app/desk/**`, `src/app/me/layout.tsx`
- **Decisions and why:**
  - Reuses the `ClimberForm` from the #33 branch so customer and desk forms stay identical.
  - Staff actions carry a `TODO(auth)`; role checks belong in `features/auth` once it exists.
- **Gotchas:** `/desk/*` redirects to `/login` without a session; the dev auth bypass is in PR #11. A missing climber ID renders not-found content with HTTP 200 because it streams inside Suspense.
- **Open follow-ups:** persist to the database; wire "Look at waiver" to the waivers feature; guardian-consent question (see #33 entry).
- **Verification:** see the PR description.

### 2026-10-13 00:00 UTC: Customer account creation (/join), mock data

- **Developer:** @agamkamran02
- **AI tool / model:** Claude Code (claude-sonnet-5-5)
- **Issue / PR:** StealthStartup-455/elevate-docs#33 / (this PR)
- **Branch:** `feature/33-account-creation-customer`
- **What the agent did:**
  - Added `/join`, a public page where a new customer enters name, phone and date of birth. QR scanning is out of scope.
  - Added the `features/climbers` base: types, server-side validation, `joinAsCustomer` server action, shared `ClimberForm`, fixed mock data.
  - After signing up, "Sign a waiver now" shows a fixed 5 s spinner (placeholder) and then a Continue button to `/me` (next page still TBD).
  - Merged `dev` (PR #11) and restyled the form with MUI (outlined card, `TextField`, `Button`) to match the busyness and membership cards.
- **Files touched:** `src/features/climbers/*`, `src/app/join/page.tsx`
- **Decisions and why:**
  - Data is an in-memory mock (`mock-data.ts`, on `globalThis` so dev hot reloads keep it). The Prisma schema is still empty, so nothing is stored in a database yet.
  - Mock data uses fixed values, not clock-relative timestamps, so features built on it are repeatable.
  - `ClimberForm` is shared on purpose: the front desk issue (#34) reuses it.
- **Gotchas:** mock records reset on server restart.
- **Open follow-ups:** persist to the database once the schema exists; open question from the issue: do under-18s need a guardian consent form?; point the QR code at `/join`.
- **Verification:** see the PR description.

### 2026-10-11 23:39 UTC: Busyness tracker scaffold (front desk + customer) with mock data

- **Developer:** @sethmess
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** sprint board #38 (front desk) and #37 (customer) / (this PR)
- **Branch:** `feature/38-busyness-tracker`
- **What the agent did:**
  - Added Material UI (`@mui/material`, `@mui/material-nextjs`, `@emotion/react`, `@emotion/styled`) and a shared `ThemeRegistry` wrapping the root layout.
  - Built the busyness data layer in `src/features/analytics/` on mock data: `getActiveCheckIns(gymId)` is the single swap point for the real query.
  - Front desk (`/desk`): "N check-ins in the last 2 hours", low/medium/high chip, and a recent check-ins table (name, time, waiver status).
  - Customer (`/me`): large glanceable level plus "~N climbers here".
  - Both views poll with `router.refresh()` every 30 s (only while the tab is visible).
  - Added a dev-only login bypass in `src/proxy.ts` (`DEV_AUTH_BYPASS="true"` in `.env`) so `/desk` and `/me` can be tested before `/login` works.
- **Files touched:** `src/features/analytics/{types,config,busyness,mock-data,queries}.ts`, `src/features/analytics/components/*`, `src/components/ui/ThemeRegistry.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/desk/page.tsx`, `src/app/me/page.tsx`, `src/proxy.ts`, `.env.example`, `package.json`, `package-lock.json`
- **Decisions and why:**
  - **MUI over shadcn/Tailwind:** the team chose MUI (per another dev), although the elevate-docs architecture draft recommended shadcn/ui. Tailwind stays; MUI styles go in `@layer mui` (`enableCssLayer`) so Tailwind utilities still override them.
  - **Busyness is computed, not stored:** active = check-in `timestamp > now - ACTIVE_WINDOW_MINUTES`. Ticket #38 mentions a "checked out" state; do not add one or a job that flips records.
  - **No database changes:** another team owns the DB. Mock data lives only in `mock-data.ts` and is only imported by `queries.ts`.
  - **Customer view gets counts only** (`getBusynessSummary`), so other climbers' names never reach a member's browser. Keep it that way.
  - Times are formatted on the server in the gym's time zone (`config.ts`, default `America/Vancouver`), not the server's zone.
  - Pages use a placeholder `DEMO_GYM_ID` until auth knows the user's gym.
  - The login bypass only applies when `NODE_ENV === "development"` (`next dev`) **and** `DEV_AUTH_BYPASS` is `"true"`; production builds ignore it. It touches auth, so it needs a reviewer who knows that area.
- **Gotchas:**
  - `cacheComponents` is on, so the busyness components call `connection()` and sit inside `<Suspense>` on the pages; removing either fails the build.
  - `/login` is still a stub, so without the bypass there is no way to reach `/desk` or `/me` locally.
  - `npm install` on Node 26/npm 12 warns that install scripts for prisma/esbuild were blocked; the build still passed.
- **Open follow-ups:** remove `DEV_AUTH_BYPASS` once `/login` works; UI polish (mobile and large-screen layout) is planned for later; swap `getActiveCheckIns` to the real check-ins query once the schema exists; move thresholds/time zone to per-gym DB settings; replace `DEMO_GYM_ID` with the signed-in user's gym; add tests for `getBusynessLevel` and window filtering once a test runner is set up.
- **Verification:** `npm run lint` passed with no warnings. `npm run build` (CI env values) passed; `/desk` and `/me` build as partial prerenders. With the bypass on in `next dev`, `/desk` and `/me` return 200 (redirect to `/login` without it) and render at 390 px and 1400 px: 28 active of 38 mock check-ins, level "Medium".

### 2026-10-11 00:00 UTC: Introduce the Exchange Floor

- **Developer:** @agamk
- **AI tool / model:** Claude Code (claude-sonnet-5-5)
- **Issue / PR:** StealthStartup-455/elevate-docs#19 / (this PR)
- **Branch:** `docs/19-exchange-floor`
- **What the agent did:**
  - Created this file as the shared log of AI-agent work.
  - Added a mandatory "Exchange Floor" section to `AGENTS.md` (read it first, log when done).
  - Pointed `.github/copilot-instructions.md` and `.cursor/rules/` at the new rule. `CLAUDE.md` and `GEMINI.md` already import `AGENTS.md`.
  - Added a checklist item to the PR template and a section to `CONTRIBUTING.md`.
- **Files touched:** `EXCHANGE_FLOOR.md`, `AGENTS.md`, `CONTRIBUTING.md`, `.github/copilot-instructions.md`, `.github/pull_request_template.md`, `.cursor/rules/exchange-floor.mdc`
- **Decisions and why:**
  - The file is named `EXCHANGE_FLOOR.md` (no spaces) so it is safe to reference in links and shell commands.
  - The rule is instruction-level only. It is not enforced by a hook or CI check yet; see follow-ups.
  - The issue lives in `StealthStartup-455/elevate-docs`, not this repo, so the PR links it with the full reference.
- **Gotchas:** an unrelated local change to `package-lock.json` was left out of this PR on purpose.
- **Open follow-ups:** optional CI check that fails a PR touching code without an Exchange Floor change.
- **Verification:** see the PR description.

### 2026-10-15 18:40 UTC: Demo QR check-in (scan on /me, popup on /desk)

- **Developer:** @Khanh150104
- **AI tool / model:** Claude Code
- **Issue / PR:** StealthStartup-455/elevate-docs#36 / (this PR)
- **Branch:** `feature/36-check-in-front-desk`
- **What the agent did:**
  - `/me`: a "Demo Scan" button under the QR code. 3 s spinner, then a success dialog (or a warning listing a missing/expired waiver or membership), then back to the menu.
  - The scan is remembered on the server (`recordScan`), and `/desk` checks for it every 2.5 s (`ScanWatcher`).
  - `/desk` popup: climber name, membership and waiver. An orange warning bar on top if the waiver isn't valid or the membership isn't active; otherwise a green Check in button.
- **Files touched:** `src/features/check-ins/{actions,scan-store}.ts`, `src/features/check-ins/components/{ScanButton,ScanWatcher}.tsx`, `src/features/climbers/components/MembershipCard.tsx`, `src/app/desk/page.tsx`
- **Decisions and why:**
  - The green button calls the existing `checkInClimber` from #20, so scan check-ins follow exactly the same rules as manual check in (valid waiver, active membership, not twice in 2 hours) and save a `FRONT_DESK` CheckIn row.
  - The scan itself only shows the climber at the desk; staff confirm with the green button.
  - The latest scan is kept in server memory (`scan-store.ts`), not the database. It is demo only, holds one scan at a time, and is lost on server restart.
- **Gotchas:** The desk only polls while its tab is visible. Test with a normal window (desk) and a private window (climber), since one browser holds one login.
- **Open follow-ups:** Real scanning (camera or scanner) and a real QR code; save QR check-ins with method `QR`; staff-only check on `takeLatestScan` once auth exists.
- **Verification:** tested by hand with demo-valid-active and demo-missing-expired.