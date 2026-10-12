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
| 2026-10-11 | @sethmess | Claude Code | `feature/38-busyness-tracker` | `src/features/analytics/`, `/desk` and `/me` pages, MUI setup in root layout | In review |

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
