# 2026-10-29 18:45 UTC: Seed gym gets a fictional name

- **Developer:** @SethMess
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#67 / PR pending
- **Branch:** `feature/67-fictional-seed-gym`
- **What the agent did:**
  - The seed gym is now "Elevate Demo Gym", slug `demo-gym` (`DEFAULT_GYM_SLUG` in `src/lib/gym.ts`, `SEED_GYM_NAME` in `prisma/seed.ts`).
  - New hand-written data migration `20261029190000_rename_seed_gym` renames the old gym row in place.
  - Updated the slug in `prisma/DATABASE.md` and the staff SQL in `DEPLOYMENT.md`.
- **Files touched:** `src/lib/gym.ts`, `prisma/seed.ts`, `prisma/migrations/20261029190000_rename_seed_gym/`, `prisma/DATABASE.md`, `DEPLOYMENT.md`
- **Decisions and why:**
  - A migration, not just a seed change: the seed upserts by slug, so changing only the slug would make a second gym on staging and leave its staff row and climbers on the old one. Migrations run before the deploy (`deploy-staging.yml`), so the new code always finds `demo-gym`.
  - The migration matches the old slug by md5 so the real name doesn't go back into the repo. It does nothing on a fresh database or if `demo-gym` already exists.
  - The name says "Demo" on purpose: it can't be mistaken for a real gym.
- **Gotchas:** The old name is still in git history; that can't be changed without rewriting history. Any open branch that still has `boulderhouse-victoria` in `src/lib/gym.ts` (#107) conflicts on that one line; keep `demo-gym`.
- **Open follow-ups:** None.
- **Verification:** `npm run lint` clean; `npm test` 86 passed; `npm run build` ok. On a local Postgres 18: the migration renamed a row with the old slug, left another gym alone, and was a no-op when run again and on an empty table; `prisma migrate deploy` + `migrate diff --exit-code` (no drift) + seed ("Seeded 89 climbers into Elevate Demo Gym"); `npm run test:db` 14 passed; `npx playwright test` 13 passed, 3 skipped (real Supabase logins not set up locally).
