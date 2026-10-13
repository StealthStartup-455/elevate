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
- **Files touched:** `src/features/climbers/*`, `src/app/join/page.tsx`
- **Decisions and why:**
  - Data is an in-memory mock (`mock-data.ts`, on `globalThis` so dev hot reloads keep it). The Prisma schema is still empty, so nothing is stored in a database yet.
  - Mock data uses fixed values, not clock-relative timestamps, so features built on it are repeatable.
  - `ClimberForm` is shared on purpose: the front desk issue (#34) reuses it.
- **Gotchas:** mock records reset on server restart.
- **Open follow-ups:** persist to the database once the schema exists; open question from the issue: do under-18s need a guardian consent form?; point the QR code at `/join`.
- **Verification:** see the PR description.

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
