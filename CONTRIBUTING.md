# Contributing to Elevate

This guide covers how we branch, commit, review and merge code. To propose a change to the process, open a pull request against this file.

## Ground rules

The following are never allowed:

- Committing or pushing directly to `main`
- Force-pushing (`git push --force`) to `main` or to another person's branch
- Merging without an approval or with failing CI checks
- Committing `.env` files, API keys or passwords
- Storing server-only secrets in `NEXT_PUBLIC_` variables, which are exposed to the browser
- Editing a migration that has already been merged into `main`

## Workflow

1. Pick an issue from the GitHub Projects board and assign it to yourself.
2. Pull the latest `main` and create a branch from it.
3. Open a pull request that links the issue. It needs 1 approval and passing CI.
4. Squash and merge the pull request, then delete the branch.

If a task has no issue, create one before starting so work isn't duplicated.

## Branches

Name branches `<type>/<issue-number>-<short-description>`, using lowercase words separated by hyphens.

Types: `feature`, `fix`, `docs`, `refactor`, `chore`

```
feature/12-waiver-import
fix/18-checkin-scan
```

- Use one branch per issue.
- Keep changes small enough to review in one sitting.

## Pull requests

- Pull requests are squash merged, so the PR title becomes the commit message on `main`. Keep it short and descriptive.
- Open a draft PR early if you want feedback on your approach.
- Complete the PR template and link the issue (for example, `Closes #12`).
- Confirm that `npm run lint` and `npm run build` pass locally.
- Include screenshots or a short recording for UI changes.
- Request a review from the owner of the area you changed (listed in the README).
- Changes to authentication, permissions, waivers or the database schema require a reviewer familiar with that area. Request a second reviewer for higher-risk changes.

## Code review

- Review pull requests within 24 hours. If you can't, let the author know.
- Prefix optional suggestions with `nit:`.
- Resolve all comments before merging.
- The author merges the pull request after approval.

## Keeping your branch up to date

Merge `main` into your branch rather than rebasing, especially if others are working on the same branch.

```bash
git fetch origin
git merge origin/main
```

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
git switch main
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
git log origin/main..HEAD     # Commits on your branch not yet on main
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

### Recovering from a commit to `main`

If the commit has not been pushed, move it to a new branch before resetting `main`.

```bash
git status
git fetch origin
git switch -c feature/12-waiver-import
git switch main
git reset --hard origin/main
git switch feature/12-waiver-import
```

**Warning:** `git reset --hard` permanently discards uncommitted changes. Run it only after confirming your commit is on the new branch and your working tree is clean.

If the commit has already been pushed to `main`, do not force-push. Notify the team so the fix can be coordinated.
