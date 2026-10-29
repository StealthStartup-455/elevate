# 2026-10-27 05:04 UTC: Generated busyness data is labelled on screen

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#64 / #82
- **Branch:** `feature/64-label-mock-busyness`
- **What the agent did:**
  - Each busyness result now says what is generated: `sampleCount` on the summaries, `sample` on each desk row and on the typical week.
  - Desk card: "Demo data: 28 of these 29 check-ins are samples, not real visits." Climber card: "Demo data: includes 28 sample check-ins, not real visits." Heat map: "Demo data: a sample week, not this gym's history." No count label when only real check-ins are shown.
  - `MOCK_BUSYNESS_SCENARIO=none` turns generated check-ins off (real only), so the no-label case can actually happen.
  - Tests: `src/features/analytics/sample.test.ts` (counts, rows, `none`, the week); `e2e/sample-data.spec.ts` (labels on the desk and climber cards).
- **Files touched:** `src/features/analytics/{mock-data,types,queries,sample.test}.ts`, `src/features/analytics/components/{FrontDeskBusyness,CustomerBusyness,BusynessHeatMap}.tsx`, `src/features/analytics/README.md`, `e2e/sample-data.spec.ts`, `DEPLOYMENT.md`
- **Decisions and why:**
  - Counted per check-in rather than a global "demo mode" flag, so the label is exact when generated and real visits are mixed (the desk saves real ones on top of the mock).
  - The heat map is always labelled: there is no real version yet. It goes when #39 computes the week from saved check-ins.
  - Plain wording ("samples, not real visits"): owners asked "is that real?" is the risk #64 names, and honesty matters after a gym pushed back on a mixed message about having a product.
- **Gotchas:** The label sits in the heat map component, so the climber card shows it under "Today" and again inside "Show full week" (collapsed). The climber card's "Live" tag predates this and still shows next to sample data.
- **Open follow-ups:** Remove the labels and `sample` fields with the mock in #39. Consider the "Live" tag then.
- **Verification:** `npm run lint` and `npx tsc --noEmit` clean; `npm test` 69 passed (2 todo), 4 new; `npm run build` passed; `npx playwright test` 14 passed, 3 skipped (real-login needs seeded Supabase logins), including the 2 new label tests and axe on every screen in light and dark. Desk (light) and climber card (dark, phone) checked by eye.
- **Review fixes (2026-10-29):** From Tyler's review: with `APP_ENV=production` and no `MOCK_BUSYNESS_SCENARIO`, the scenario defaults to `none`, so a real gym never sees generated check-ins by default (`defaultScenario()` in `mock-data.ts`, one new test in `sample.test.ts`, `DEPLOYMENT.md`); the `busynessNow` comment says it returns the real clock with `none`. `npm test` analytics 16 passed, `npx tsc --noEmit` and `npm run lint` clean.
