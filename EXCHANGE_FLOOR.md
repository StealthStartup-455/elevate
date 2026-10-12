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
| 2026-10-12 | @Khanh150104 | Claude Code | `feature/33-signup-checkin-schema` | `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts` | In review |
| 2026-10-11 | @agamk | Claude Code | `docs/19-exchange-floor` | `EXCHANGE_FLOOR.md`, `AGENTS.md`, agent config | In review |

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

### 2026-10-12 22:45 UTC: Database schema for sign-up, PIN check-in and check-ins

- **Developer:** @Khanh150104
- **AI tool / model:** Claude Code
- **Issue / PR:** StealthStartup-455/elevate-docs#33 (also #34, #35, #36) / (this PR)
- **Branch:** `feature/33-signup-checkin-schema`
- **What the agent did:**
  - Added the first real schema: `Gym`, `Staff`, `Climber`, `CheckIn`, `CheckInCode` plus enums `StaffRole`, `SignupSource`, `CheckInMethod`, `CodeChannel`.
  - Generated the first migration (`20261012222917_signup_and_checkin`) with `prisma migrate dev`.
  - Replaced the empty seed with a demo gym, one desk staff member, five mock climbers (one under 18) and four check-ins.
- **Files touched:** `prisma/schema.prisma`, `prisma/migrations/20261012222917_signup_and_checkin/migration.sql`, `prisma/migrations/migration_lock.toml`, `prisma/seed.ts`
- **Decisions and why:**
  - Every table has `gymId` except `Gym` itself. A two-location business is two `Gym` rows.
  - The public sign-up link is `/join/<gym.slug>`; no separate invite-link table.
  - `Climber.email` and `Climber.phone` are each optional but unique per gym, because they are the check-in lookup keys. "At least one of them" is enforced in app code. Store email lowercased and phone as E.164.
  - Guardian consent (open question in #33/#34): nullable `guardianName`, `guardianPhone`, `guardianConsentAt` on `Climber`; the app requires them when the climber is under 18. Signed waivers stay with the waivers feature.
  - `CheckInCode` stores only a hash of the PIN, with `expiresAt`, `attempts` and `usedAt`, so a code is single-use and brute-force limited.
  - `CheckIn.timestamp` and no checked-out state, matching the busyness tracker (`feature/38-busyness-tracker`), so `getActiveCheckIns` can query it directly.
  - `Staff.authUserId` / `Climber.authUserId` link to Supabase Auth users; no foreign key to `auth.users` since Prisma only manages `public`.
- **Gotchas:**
  - Prisma 7 `migrate dev` does not regenerate the client: run `npx prisma generate` (or `npm install`) after migrating, or `npm run build` fails type-checking `prisma/seed.ts`.
  - Family members sharing one phone or email cannot both use it; a child without their own contact checks in at the desk. Revisit if gyms ask for family check-in.
- **Open follow-ups:** sign-up and check-in actions/queries in `src/features/climbers` and `src/features/check-ins`; sending the PIN (email/SMS provider not chosen); swap the busyness mock to `CheckIn`; Supabase row-level security policies.
- **Verification:** `prisma validate` passed; `prisma migrate dev` applied the migration to a local Postgres 16; `npm run db:seed` ran twice cleanly; a duplicate email in the same gym was rejected by `Climber_gymId_email_key`; `npm run lint` passed with no warnings; `npm run build` passed.

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
