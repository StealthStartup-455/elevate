# 2026-10-29 07:01 UTC: The desk polls less and does less per poll

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#86 / PR pending
- **Branch:** `feature/86-desk-polls-less`
- **What the agent did:**
  - `getGym()` keeps the gym row for a minute per server instance (`loadGym`, `GYM_CACHE_MS`), instead of reading it on every request. The desk's scan check (every 2.5 s) drops from two queries to one when nobody has scanned.
  - The desk re-renders its whole page every 5 minutes instead of every 30 seconds (`DESK_BUSYNESS_REFRESH_MS`); it already refreshes straight after each check-in it makes, so the timer only catches check-ins ageing out of the 2 hour window. The climber's busyness card refreshes every minute (`CLIMBER_BUSYNESS_REFRESH_MS`).
  - Unit tests for the gym cache (`src/lib/gym.test.ts`); analytics README updated.
- **Files touched:** `src/lib/{gym,gym.test}.ts`, `src/features/analytics/{config.ts,README.md}`, `src/features/analytics/components/{FrontDeskBusyness,CustomerBusyness}.tsx`
- **Decisions and why:**
  - Kept the 2.5 s scan check: a scan should still show within about 2 seconds (#86). Making each check cheaper was the safe win; pushing scans with Supabase Realtime would remove the polling but needs table access rules first.
  - A minute's staleness for the gym row is fine: name, time zone and waiver version rarely change. Call `forgetGym()` after changing the gym in code.
  - Rough effect for an idle desk, from the code (not measured on staging yet): about 70 queries a minute before (24 scan checks of 2 queries, plus 2 full page renders of about 10) to about 25 after (24 of 1, plus a render every 5 minutes). PERF_LOG (#100) can confirm on staging.
- **Gotchas:** With two desks open, a check-in at one shows on the other's busyness within 5 minutes, not 30 seconds.
- **Open follow-ups:** Supabase Realtime for scans (would remove the 2.5 s poll). Measure on staging with PERF_LOG once #100 is merged.
- **Verification:** `npm run lint`, `npx tsc --noEmit` clean; `npm test` 86 passed (2 todo), 3 new; `npm run build` passed; `npx playwright test` 13 passed, 3 skipped (real-login needs seeded Supabase logins).
