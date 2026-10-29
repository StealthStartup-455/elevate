# Exchange Floor

The shared log of everything AI agents do in this repo, one file per entry. Every agent **reads the newest entries before starting a task** and **adds one file when it finishes** (see "Exchange Floor (mandatory)" in `AGENTS.md`).

It exists so that one person's agent never repeats, contradicts or breaks what another person's agent already did.

Each branch adds its own new file, so two pull requests never edit the same file and never conflict here (#102). Entries before 2026-10-29 are in `EXCHANGE_FLOOR.md` at the repo root, kept unchanged as an archive.

## Before you start a task

1. `git fetch origin`, then list the newest entries on `origin/dev`, not a stale local copy:

   ```bash
   git ls-tree --name-only origin/dev exchange-floor/ | grep -v README | sort | tail -10
   git show origin/dev:exchange-floor/<file>
   ```

   Read at least those 10. Read further back (including `EXCHANGE_FLOOR.md`) if your task touches the same files or area.
2. See what is in progress right now: the open pull requests (`gh pr list`, or Pull requests on GitHub) and their branches. Open PRs replace the old Active work table.
3. If someone else's agent is working on the same area, or left an open follow-up for it, tell the developer before you begin.

## When you finish a task

1. Add **one new file** in this folder, named `YYYY-MM-DD-HHMM-<branch>.md` in UTC, with the branch's `/` written as `-`. Example: `2026-10-29-0534-docs-102-exchange-floor-entries.md`. The names sort by time and can't collide.
2. Fill it in from the template below.
3. Commit it in the same pull request as the work, and say in the PR description that you added an Exchange Floor entry.

While your branch is open you may update your own file (for example, the verification after a review fix). Once it's merged, it's fixed.

## Rules

- Never edit or delete another entry. Correct a mistake with a new file that names the old one.
- Facts, not narrative: what was done, what was decided, and what the next agent must know.
- Never put secrets, tokens, `.env` values or personal data in an entry.
- Don't add new entries to `EXCHANGE_FLOOR.md`; it is the archive.

## Template

```markdown
# YYYY-MM-DD HH:MM UTC: <short title>

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
