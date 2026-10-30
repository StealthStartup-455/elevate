# 2026-10-29 18:52 UTC: The demo scan button says it's a simulation

- **Developer:** @SethMess
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#94 / PR pending
- **Branch:** `feature/94-honest-demo-scan`
- **What the agent did:**
  - The /me button "Demo Scan" is now "Simulate scan", with "Demo only: at the gym, the desk scans your code." under it.
  - Comments that named the old button (`check-ins/actions.ts`, `ScanWatcher.tsx`).
- **Files touched:** `src/features/check-ins/components/ScanButton.tsx`, `src/features/check-ins/actions.ts`, `src/features/check-ins/components/ScanWatcher.tsx`
- **Decisions and why:**
  - The rename option from the issue, not a desk camera scanner: small and safe before the demo. A real scanner (USB keyboard-wedge or camera) is its own issue.
  - "Simulate scan", not "Simulate desk scan": the longer label widened the QR column and squeezed the membership text on a 390px phone. The note says the rest.
  - The note has `width: 0; minWidth: 100%` so it wraps to the QR code's width instead of widening the column.
- **Gotchas:** e2e finds the button with `/scan/i`, so no test changes were needed.
- **Open follow-ups:** Hide the button outside demo mode once a real desk scanner exists; it is the only way to send a scan today.
- **Verification:** `npm run lint` clean; `npm test` 86 passed; `npm run build` ok; `npx playwright test` 13 passed, 3 skipped (real Supabase logins not set up locally). Checked /me at 390px in light and dark.
