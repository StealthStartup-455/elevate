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
| 2026-10-11 | @agamk | Claude Code | `docs/19-exchange-floor` | `EXCHANGE_FLOOR.md`, `AGENTS.md`, agent config | In review |
| 2026-10-11 | @sethmess | Claude Code | `feature/38-busyness-tracker` | `src/features/analytics/`, `src/features/climbers/` (membership card), `src/lib/fuzzy.ts`, `/`, `/desk` and `/me` pages, MUI setup | In review |
| 2026-10-13 | @agamkamran02 | Claude Code | `feature/33-account-creation-customer` | `src/features/climbers/*`, `src/app/join` | In review |
| 2026-10-13 | @agamkamran02 | Claude Code | `feature/34-account-creation-front-desk` | `src/features/climbers/*`, `src/app/desk/climbers/*` | In review (stacked on #33 branch) |

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
