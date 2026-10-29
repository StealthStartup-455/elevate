# 2026-10-29 06:42 UTC: The desk ignores scans made before it opened

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#91 / PR pending
- **Branch:** `fix/91-ignore-old-scans`
- **What the agent did:**
  - New staff-only action `startWatchingScans()` returns the server's time when the desk page opens; `ScanWatcher` waits for it, then passes it to `takeLatestScan(watchingSince)` on every poll.
  - `takeScan(gymId, now, notBefore)` only returns scans made after `notBefore` (and still within `SCAN_TTL_MS`).
  - Tests: two new database tests in `scan-store.db.test.ts`; smoke e2e "a scan made before the desk opens doesn't pop up later" (fails on the old code).
- **Files touched:** `src/features/check-ins/{scan-store,actions,scan-store.db.test}.ts`, `src/features/check-ins/components/ScanWatcher.tsx`, `e2e/smoke.spec.ts`
- **Decisions and why:**
  - The start time comes from the server, so a desk computer with a wrong clock can't hide or replay scans.
  - A `watchingSince` that isn't a date, is in the future or is over a day old is ignored, falling back to the 2 minute limit.
  - Old scans stay in the table untaken; they're simply never shown.
- **Gotchas:** A full reload of the desk page starts a new watch, so a scan made during the reload itself (a second or two) isn't shown; scan again.
- **Open follow-ups:** #86 may replace polling; keep `notBefore` if it does.
- **Verification:** `npm run lint`, `npx tsc --noEmit` clean; `npm test` 83 passed (2 todo); `npm run test:db` 16 passed; `npm run build` passed; `npx playwright test` 14 passed, 3 skipped (real-login needs seeded Supabase logins). The new e2e test fails against `dev` without this change.
