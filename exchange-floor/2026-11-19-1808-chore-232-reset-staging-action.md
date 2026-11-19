# 2026-11-19 18:08 UTC: Reset staging from GitHub Actions

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#232 / PR pending
- **Branch:** `chore/232-reset-staging-action`
- **What the agent did:**
  - New manual workflow `.github/workflows/reset-staging.yml` (Actions, Reset staging, Run workflow): runs `prisma/seed.ts` against staging with `STAGING_DIRECT_URL` from the staging environment, the same reset as `npm run staging:reset` (#138).
  - Guards: the confirmation box must say `reset`, it only runs from `dev`, it stops if `prisma migrate status` reports pending migrations, and it shares the `deploy-staging` concurrency group so it never overlaps a deploy.
  - The run summary shows the seed's "Removed …" and "Seeded …" lines.
  - DEPLOYMENT.md, "Reset before a demo": the button first, the local command second.
- **Files touched:** `.github/workflows/reset-staging.yml`, `DEPLOYMENT.md`.
- **Decisions and why:**
  - Uses the existing `STAGING_DIRECT_URL` secret (the session pooler the deploy already migrates with) for both `DIRECT_URL` and `DATABASE_URL`, so no new secret is needed.
  - No Supabase secrets are passed, so the seed's login step is skipped and `climber@elevate.test` isn't relinked; the demo usernames work.
  - Refuses on pending migrations instead of applying them: changing the schema is Deploy staging's job.
- **Gotchas:** `workflow_dispatch` only shows the button once the workflow is on the default branch (`dev`), so it can't be tried from this branch before merge. Locally, `npm ci` needs npm 11 (Node 24); npm 10 rejects the lockfile.
- **Open follow-ups:** None.
- **Verification:** `npm run lint` clean. The workflow YAML parses. It can only run after merge (see Gotchas); the first run on dev is the real test.
