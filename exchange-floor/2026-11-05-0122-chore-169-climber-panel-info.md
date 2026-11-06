# 2026-11-05 01:22 UTC: Add three check-in demo examples

- **Developer:** @TylerLeHere
- **AI tool / model:** Codex
- **Issue / PR:** StealthStartup-455/elevate#169 / current branch at developer request
- **Branch:** `chore/169-climber-panel-info`
- **What the agent did:** Kept saved mock visits mixed with recorded check-ins and the existing rolling two-hour count. Added exactly one daily demo row for employee access, a day pass and an expired waiver. No attendance-mode redesign.
- **Files touched:** `src/features/check-ins/{demo-examples.ts,demo-day.ts,day.ts,queries.ts,queries.db.test.ts,README.md}`, `BadgePill.tsx`, `STYLE_GUIDE.md`, this entry.
- **Decisions and why:** Demo examples have separate fictional customer profiles and deterministic daily ids. Existing ordinary samples remain unchanged. Employee pass is a display fixture backed by membership, not a new authorization role. The expired-waiver visit is explicitly a demo fixture; real check-in validation is unchanged. Demo initialization stays disabled in production and other gyms.
- **Gotchas:** The developer stopped the larger attendance-mode/UI work and restored the branch to d8f45f5 before this narrower change. The live reference server can retain older compiled UI; final review used an isolated source copy on port 3001. Opening that demo added the three requested sample visits to the shared local demo database; no reseed or customer deletion was performed.
- **Open follow-ups:** Real employee-pass entitlements would require a separate feature. None for the requested demo fixtures.
- **Verification:** Lint and TypeScript passed; 311 unit tests passed (2 todo); 65 database tests passed, covering concurrent initialization, three example badges/statuses, a new arrival increasing the count, ageing out after two hours and next-day history. Browser verified all three example rows and captured light/dark screenshots. npm run build failed with the existing Turbopack worker-port permission error (Operation not permitted).
