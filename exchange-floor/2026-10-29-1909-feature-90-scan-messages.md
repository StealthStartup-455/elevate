# 2026-10-29 19:09 UTC: Scan messages say the desk will help; the desk popup offers the fix

- **Developer:** @SethMess
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#90 / PR pending
- **Branch:** `feature/90-scan-messages` (stacked on `feature/85-desk-loads-less`, PR #108)
- **What the agent did:**
  - New `src/features/check-ins/scan-messages.ts` (+ unit tests): `climberScanMessages` (phone wording per problem) and `deskNextStep` (the desk's next step), so phone and desk never disagree.
  - Phone (`ScanButton.tsx`): "Scanned, but…" warning is now "Your scan reached the desk", an info alert with one "They'll help you…" line per problem (missing/expired waiver; no, expired or paused membership).
  - Desk popup (`ScanWatcher.tsx`): a "Next: …" line, and a **Sign waiver** button (stopgap, same as the climber page's waiver step) beside the existing **Give free day pass**. Waiver first, then day pass, then Check in.
  - New `e2e/scan-next-step.spec.ts`: a climber joins without a waiver, scans; phone shows both messages; the desk signs, gives a day pass and checks them in.
- **Files touched:** `src/features/check-ins/{scan-messages,scan-messages.test}.ts`, `src/features/check-ins/components/{ScanButton,ScanWatcher}.tsx`, `e2e/scan-next-step.spec.ts`
- **Decisions and why:**
  - Stacked on #108 because it rewrites `ScanWatcher.tsx`; branching from dev would have conflicted.
  - The desk alert text ("needs a valid waiver and has no active membership or day pass") is unchanged: manual check in and e2e share it, and the popup already shows each status. The fix goes in the new "Next:" line and buttons.
  - "Sell a membership" / "renew" / "restart" appear only as words in the next step: there is no membership sale yet (#44 to #46), so the day pass stays the one button.
  - Phone alert is `severity="info"`, not warning: the climber did nothing wrong.
- **Gotchas:** #94 (`feature/94-honest-demo-scan`) also edits `ScanButton.tsx` (button label and note); different hunks, should merge cleanly.
- **Open follow-ups:** Manual check in (`ManualCheckIn.tsx`) could show the same "Next:" line and Sign waiver button.
- **Verification:** `npm run lint` clean; `npm test` 104 passed; `npm run test:db` 16 passed; `npm run build` ok; `npx playwright test` 18 passed, 3 skipped (real Supabase logins not set up locally). Checked the phone dialog and desk popup in light and dark.
