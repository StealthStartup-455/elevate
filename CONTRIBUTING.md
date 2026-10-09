# Contributing to Elevate

This guide covers how we branch, commit, review, merge and release code. It applies equally to **developers and AI coding agents**. To propose a change to the process, open a pull request against this file.

## Should Not Do

- Committing or pushing directly to `main`, `release` or `dev`. All three are protected.
- Force-pushing (`git push --force`) to `main`, `release`, `dev` or another person's branch.
- Merging without an approval or with failing CI checks.
- Branching feature work from `main` or `release`. Feature branches start from `dev`.
- Squash-merging `release` into `main`, `main` into `dev`, or `dev` into `release`. These use merge commits (see [Merge methods](#merge-methods)).
- Committing `.env` files, API keys or passwords.
- Storing server-only secrets in `NEXT_PUBLIC_` variables, which are exposed to the browser.
- Editing a migration that has already been merged into `dev`, `release` or `main`.
- Skipping hooks or checks (`--no-verify`) or weakening CI or rulesets to get a change through.

## Branch model

Three long-lived branches. Nothing is committed to them directly; they only change through pull requests.

| Branch | Purpose | Receives PRs from |
|---|---|---|
| `dev` | Integration. All finished work for the next release lands here. | `feature/*`, `fix/*`, `docs/*`, `refactor/*`, `chore/*` |
| `release` | Stabilization. Receives a snapshot of `dev` on release day; bug fixes only. | `dev` (the cut), `fix/*` (release fixes) |
| `main` | Production. Every commit is a release and is tagged `vX.Y.Z`. | `release`, `hotfix/*` |

```
feature/12-x --PR (squash)--+
fix/18-y -----PR (squash)---+
                            v
dev      --*---*---*---*---*---*---*---*-------------*--->
                           |  cut (PR, merge commit)  ^ back-merge (PR, merge commit)
                           v                          |
release                    *---*(fixes only)--+       |
                                              v       |
main     -------------------------------------*-(vX.Y.Z)---->
                                              ^
hotfix/20-z --PR (merge commit)---------------+  (then back-merged to dev)
```

## Workflow (everyday work)

1. Pick an issue from the GitHub Projects board and assign it to yourself.
2. Pull the latest `dev` and create a branch from it.
3. Open a pull request into `dev` that links the issue. It needs 1 approval and passing CI.
4. Squash and merge the pull request, then delete the branch.

If a task has no issue, create one before starting so work isn't duplicated.

## Branch names

Name branches `<type>/<issue-number>-<short-description>`, using lowercase words separated by hyphens.

Types: `feature`, `fix`, `docs`, `refactor`, `chore`, `hotfix`

```
feature/12-waiver-import
fix/18-checkin-scan
hotfix/20-checkin-crash
```

- Use one branch per issue.
- Keep changes small enough to review in one sitting.

## Merge methods

| PR | Target | Method | Why |
|---|---|---|---|
| `feature/*`, `fix/*`, `docs/*`, `refactor/*`, `chore/*` | `dev` | **Squash** | One commit per change; the PR title is the commit message. |
| `fix/*` (release fix) | `release` | **Squash** | Same. |
| `dev` (the cut) | `release` | **Merge commit** | Keeps the long-lived branches' histories shared. |
| `release` or `hotfix/*` | `main` | **Merge commit** | Squashing would make `main` diverge from `release`. |
| `main` (back-merge) | `dev` | **Merge commit** | Brings release fixes and hotfixes into `dev`. |

Rebase merges are not used.

The **Branch policy** CI check enforces branch names and PR targets: `main` accepts PRs only from `release` or `hotfix/*`, `release` only from `dev`, `main`, `fix/*` or `hotfix/*`, and everything else goes into `dev`. Both checks (`check` and `branch-policy`) must pass before merging.

## Pull requests

- The PR title becomes the commit message on squash merges. Keep it short and descriptive.
- Open a draft PR early if you want feedback on your approach.
- Complete the PR template and link the issue (for example, `Closes #12`).
- Confirm that `npm run lint` and `npm run build` pass locally.
- Include screenshots or a short recording for UI changes.
- Request a review from the owner of the area you changed (listed in that feature folder's README).
- Changes to authentication, permissions, waivers or the database schema require a reviewer familiar with that area. Request a second reviewer for higher-risk changes.
- Check the PR's **target branch** before you open it. Everyday work targets `dev`, not `main`.

## Code review

- Review pull requests within 24 hours. If you can't, let the author know.
- Prefix optional suggestions with `nit:`.
- Resolve all comments before merging.
- The author merges the pull request after approval.

## Releases

Releases happen on the agreed release date. The release manager (rotating, named in the release issue) runs them.

### 1. Cut the release

Open a PR from `dev` into `release` titled `Release YYYY-MM-DD` and **merge it with a merge commit**. `dev` stays open for new work; from here on, only fixes go into `release`.

### 2. Stabilize

Bug found in the release? Branch from `release`, fix it, and open a PR into `release` (squash):

```bash
git fetch origin
git switch -c fix/31-release-crash origin/release
git push -u origin HEAD
```

### 3. Ship

1. Open a PR from `release` into `main` with the same title and **merge it with a merge commit**.
2. Tag the new `main` and push the tag:

   ```bash
   git fetch origin
   git switch main
   git pull --ff-only
   git tag -a v1.0.0 -m "Release 1.0.0"
   git push origin v1.0.0
   ```

3. **Back-merge:** open a PR from `main` into `dev` and **merge it with a merge commit**, so fixes made on `release` are not lost.

Use semantic versioning: `MAJOR.MINOR.PATCH`.

## Hotfixes

For a bug in production that cannot wait for the next release:

```bash
git fetch origin
git switch -c hotfix/20-checkin-crash origin/main
git push -u origin HEAD
```

1. Open a PR into `main` (**merge commit**), with 1 approval and passing CI.
2. Tag the patch release (for example `v1.0.1`).
3. Back-merge `main` into `dev` (and into `release` if a release is in progress) with a merge-commit PR.

## Keeping your branch up to date

Merge the branch you started from into yours rather than rebasing, especially if others are working on the same branch. For everyday work that is `dev`.

```bash
git fetch origin
git merge origin/dev
```

## Rules for AI agents

AI coding agents (Claude Code, Copilot, Codex and others) follow every rule in this file. In addition:

- Work only on a branch named `<type>/<issue-number>-<short-description>`, created from the latest `origin/dev` (hotfixes: `origin/main`; release fixes: `origin/release`). If you do not know the issue number, ask the developer rather than inventing one.
- Never push to, merge into, or delete `main`, `release` or `dev`. Open a pull request and stop.
- Never merge a pull request. A human merges after review and approval.
- Do not approve your own pull request, or add yourself as the reviewer.
- Never force-push, rewrite published history, change rulesets or repository settings, or create tags and releases. Those are done by the release manager.
- Do not bypass hooks or CI (`--no-verify`, disabling or editing checks to make them pass). Fix the cause.
- Run `npm run lint` and `npm run build` before opening a pull request and report the real result.
- Mention in the pull request description that an AI agent contributed. The human who opened the PR is accountable for the changes.
- Read the Next.js docs in `node_modules/next/dist/docs/` before writing Next.js code (see `AGENTS.md`).
- When unsure which branch a change belongs on, stop and ask.

## Database changes

- After editing `prisma/schema.prisma`, run `npm run db:migrate`.
- Commit the schema change and its migration together.
- Notify the team if a migration requires others to reset their local database.
- Every table must include a `gymId`.

## Environment variables

- Add new variables to `.env.example` with a placeholder value.
- Use the `NEXT_PUBLIC_` prefix only for values that are safe to expose in the browser.

## Git reference

### Start a task

```bash
git status
git switch dev
git pull --ff-only
git switch -c feature/12-waiver-import
```

### Commit and push

```bash
git diff
git add -p
git diff --staged
git commit
git push -u origin HEAD
```

### Inspect history

```bash
git branch -a
git log --oneline --graph
git log origin/dev..HEAD      # Commits on your branch not yet on dev
```

### Undo changes

```bash
git restore --staged <file>   # Unstage a file and keep the changes
git restore <file>            # Discard unstaged changes (cannot be undone)
git stash                     # Temporarily save changes
git stash pop                 # Restore saved changes
git commit --amend            # Amend the last commit (only if not yet pushed)
git revert <commit>           # Undo a pushed commit with a new commit
```

### Recovering from a commit to a protected branch

If you committed to `dev` (or `release`, or `main`) and the commit has not been pushed, move it to a new branch before resetting.

```bash
git status
git fetch origin
git switch -c feature/12-waiver-import
git switch dev
git reset --hard origin/dev
git switch feature/12-waiver-import
```

Replace `dev` with the protected branch you committed to.

**Warning:** `git reset --hard` permanently discards uncommitted changes. Run it only after confirming your commit is on the new branch and your working tree is clean.

If the commit has already been pushed to a protected branch, do not force-push. The push will be rejected by the rulesets; notify the team so the fix can be coordinated.
