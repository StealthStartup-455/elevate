# Git rules (mandatory)

These rules apply to every AI coding agent and every developer, whatever the tool. They are enforced by git hooks, CI and GitHub rulesets, so a violation will be rejected and cannot be worked around. Do not try. If a rule blocks you, stop and tell the developer.

Full detail is in **CONTRIBUTING.md**. Read it before any git action.

## Branches

- `dev` (integration), `release` (stabilization) and `main` (production) are **protected**. Never commit, push, merge, rebase or force-push to them. Never delete them.
- Branch names **must** match `<type>/<issue-number>-<short-description>`:
  - `type` is one of `feature`, `fix`, `docs`, `refactor`, `chore`, `hotfix`
  - the issue number is required; description is lowercase words separated by hyphens
  - regex: `^(feature|fix|docs|refactor|chore|hotfix)/[0-9]+-[a-z0-9]+(-[a-z0-9]+)*$`
  - examples: `feature/12-waiver-import`, `fix/18-checkin-scan`
  - not allowed: `my-branch`, `copilot/fix-bug`, `claude/abc123`, `feature/waiver-import` (no issue number), `Feature/12-X` (uppercase)
- If you do not know the issue number, **ask the developer**. Never invent one. If there is no issue, ask the developer to create one first.
- One branch per issue.

## Before you touch git

Run these first and check the output:

```bash
git branch --show-current          # must NOT be dev, release or main before you commit
git fetch origin
```

Start work from the correct base:

| Work | Base | PR target |
|---|---|---|
| Everyday work | `origin/dev` | `dev` |
| Fix found while a release is in progress | `origin/release` | `release` |
| Production hotfix | `origin/main` | `main` |

```bash
git switch -c <type>/<issue-number>-<short-description> origin/dev
```

If you are on `dev`, `release` or `main` with uncommitted work, create the correctly named branch first (`git switch -c ...`); your changes come with you.

## Pull requests

- Open pull requests only into the target in the table above. Everyday work targets `dev`, never `main`.
- Link the issue (`Closes #12`) and fill in the PR template.
- Run `npm run lint` and `npm run build` first and report the real result.
- State in the PR description that an AI agent contributed.

## Never do these

- Push to, commit on, or merge into `main`, `release` or `dev`.
- Merge or approve a pull request. A human does both.
- Force-push, delete remote branches you did not create, or rewrite published history.
- Use `--no-verify` or change `core.hooksPath`; disable, edit or skip hooks, CI checks or rulesets.
- Create tags or releases, or change repository settings, rulesets or branch protection.
- Rename a branch to dodge a check, or push to a differently named remote ref (`git push origin HEAD:main`).
- Commit `.env` files, keys or passwords.

## When something is rejected

A hook, CI check or ruleset rejection is the system working. Fix the cause (usually the branch name or target) and retry the normal way. Do not look for another route to the same result. If you cannot fix it, stop and explain to the developer.

## Exchange Floor (mandatory)

`EXCHANGE_FLOOR.md` at the repo root is the shared, living log of everything AI agents have done here. It stops one agent repeating, contradicting or breaking another's work.

**Before you start any task** (before planning, editing or creating a branch):

1. Run `git fetch origin`, then read `EXCHANGE_FLOOR.md` from `origin/dev` (`git show origin/dev:EXCHANGE_FLOOR.md`). Read the **Active work** table and at least the last 10 timeline entries.
2. Take in what other agents did, their decisions, gotchas and open follow-ups. If your task overlaps active work or a follow-up, tell the developer before you begin.
3. Tell the developer in one line what you picked up from it, or that there was nothing relevant.

**When you finish** (in the same branch and pull request as the work):

1. Add an entry at the top of the timeline using the template in the file: what you did, files touched, decisions, gotchas, follow-ups, and the real verification results.
2. Update the **Active work** table.
3. Say in the PR description that you added an Exchange Floor entry.

The log is append-only. Never delete or rewrite another entry, and never put secrets in one.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
