# 2026-10-29 06:53 UTC: The front desk loads only the climbers it shows

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#85 / PR pending
- **Branch:** `feature/85-desk-loads-less`
- **What the agent did:**
  - Manual check in searches on the server as staff type (200 ms after the last keystroke): new server action `findClimbersToCheckIn(query)` and query `searchClimbers(query, limit)`. It matches names and phones in one light query, then loads waiver and membership for the 8 best matches only. `ManualCheckInButton` no longer loads every climber, so the desk page no longer carries the climber list.
  - `getCheckInClimbers(keys)` loads only the climbers behind the desk's recent check-ins (by database id or the seeded busyness `externalId`), with their latest waiver, instead of every climber with waivers and passes.
  - Search rules moved to `src/features/climbers/search.ts` (`searchScore`, `bestMatches`) so the browser table and the server share them; same fuzzy matching (typos, sound-alikes are still #63).
  - `CheckInCandidate` moved to `types.ts`; `findRows` takes a list of ids.
- **Files touched:** `src/features/climbers/{queries,actions,types,search,search.test}.ts`, `src/features/climbers/components/{ManualCheckIn,ManualCheckInButton,ClimberTable}.tsx`, `src/features/analytics/components/FrontDeskBusyness.tsx`, `e2e/manual-check-in.spec.ts`
- **Decisions and why:**
  - Fuzzy matching stays in JavaScript (`src/lib/fuzzy.ts`) rather than SQL, so typo tolerance is unchanged. The match query reads only id, names and phone for the gym; if a gym's list grows large, move matching into Postgres (`pg_trgm`).
  - Live desk check-ins now also link to the climber's page in the recent check-ins table (before, only seeded busyness climbers did).
- **Gotchas:** The desk has two fields labelled "Search name or phone" (the check-in table and the dialog); scope tests to the dialog.
- **Stacked:** on `fix/92-one-dialog-at-a-time` (itself on `fix/91-ignore-old-scans`): both #92 and this change `ManualCheckIn`. Merge #91, then #92, then this.
- **Open follow-ups:** #86 (polling); the Climbers page still loads every climber (paging and server search would be its own issue).
- **Verification:** `npm run lint`, `npx tsc --noEmit` clean; `npm test` 87 passed (2 todo), 4 new; `npm run test:db` 14 passed; `npm run build` passed; `npx playwright test` 15 passed, 3 skipped (real-login needs seeded Supabase logins), including 2 new tests (the desk page doesn't contain a climber who isn't checked in; a typo search finds them). Locally the /desk HTML went from 270 KB to 247 KB and no longer contains the climber list; the timing gain shows on staging, where each query costs more.
