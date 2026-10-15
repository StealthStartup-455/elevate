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
| 2026-10-15 | @ekamgill | Copilot CLI | `feature/24-product-page` | `docs/index.html`, `docs/styles.css`, `EXCHANGE_FLOOR.md` | Done (local; uncommitted) |
| 2026-10-11 | @agamk | Claude Code | `docs/19-exchange-floor` | `EXCHANGE_FLOOR.md`, `AGENTS.md`, agent config | In review |
| 2026-10-11 | @sethmess | Claude Code | `feature/38-busyness-tracker` | `src/features/analytics/`, `src/features/climbers/` (membership card), `src/lib/fuzzy.ts`, `/`, `/desk` and `/me` pages, MUI setup | In review |
| 2026-10-13 | @agamkamran02 | Claude Code | `feature/33-account-creation-customer` | `src/features/climbers/*`, `src/app/join` | In review |
| 2026-10-13 | @agamkamran02 | Claude Code | `feature/34-account-creation-front-desk` | `src/features/climbers/*`, `src/app/desk/climbers/*` | In review (stacked on #33 branch) |
| 2026-10-13 | @agamkamran02 | Claude Code | `feature/41-account-login` | `src/features/auth/*`, `/`, `/login`, `/me`, `src/features/climbers/*` | In review (stacked on #33/#34 branches) |
| 2026-10-14 | @TylerLeHere | Claude Code | `feature/21-build-a-mock-database` | `prisma/DATABASE.md`, `README.md` | Done (docs only) |
| 2026-10-14 | @agamkamran02 | Claude Code | `42-connect-frontend-and-backend` | `src/features/climbers/*`, `src/features/auth/*`, `src/lib/gym.ts`, `prisma/seed.ts`, `prisma/schema.prisma` | In review |
| 2026-10-15 | @Khanh150104 | Claude Code | `feature/36-check-in-front-desk` | `src/features/check-ins/*`, `MembershipCard.tsx`, `/desk` page | In review |
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
- **Verification:** `npm run lint` ✅ / `npm run build` ✅ (change these if yours differ); tested by hand with demo-valid-active and demo-missing-expired.