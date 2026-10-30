# 2026-10-30 03:05 UTC: Release check for the pilot journey

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#43 / #121
- **Branch:** `feature/43-release-check` (the second branch for #43; the first, `feature/43-show-app-version`, added the app version)
- **What the agent did:**
  - `e2e/release.spec.ts`: one test walking the pilot journey in order, one `test.step` per workflow #43 names: sign in (logged out visitors go to log in; the desk logs in), join, waiver status (missing, then signed, still signed after a reload), sign in again (log out, back in with the demo username), purchase (scan, the desk gives a day pass), check in, busyness (desk count and the climber's "~N climbers here" both up by one; the climber is in Recent check-ins).
  - `npm run test:release` runs it alone, locally or with `E2E_BASE_URL` against staging. The full suite runs it too.
  - `DEPLOYMENT.md`: new "Release checks" section (the steps, how to run, the known limitations), and "Before a demo" now runs `test:release`.
- **Files touched:** `e2e/release.spec.ts`, `package.json`, `DEPLOYMENT.md`
- **Decisions and why:**
  - One test with steps rather than one test per workflow: the workflows depend on each other (the climber who joins is the one who checks in), and a failure names the step that broke.
  - It uses today's stopgaps (placeholder waiver button, free day pass) and says which PR replaces each (#118, #119). The test should change with those PRs, so it keeps following the real journey.
- **Gotchas:**
  - It closes every browser context after it runs. A desk page left open keeps polling and takes the next test's scans (the smoke test's second scan failed every time until this was added).
  - On `/me`, look inside `<main>`: while the page streams in, a second copy of the membership card can briefly sit outside it, and an unscoped `getByText` fails in strict mode. Same effect PR #115 saw on `/desk/climbers/new`.
  - Logging out goes to `/`, not `/login`.
- **Open follow-ups:** When #118 merges, the waiver step fills in the form on `/me/waiver`. When #119 merges, the purchase step sells a day pass at the POS. When real climber sign in lands (#26, #33), the sign in again step uses it. #43 can close once those are in.
- **Verification:** On dev at d00c7f6 (with #112 to #116): `npm run lint` and `npx tsc --noEmit` clean; `npm run build` passed; `npx playwright test` 18 passed, 3 skipped (real Supabase logins), twice in a row; `release.spec.ts` with the smoke test after it, 2 passed.
