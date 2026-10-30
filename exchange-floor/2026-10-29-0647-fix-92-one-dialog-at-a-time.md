# 2026-10-29 06:47 UTC: One dialog at a time on the front desk

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#92 / PR pending
- **Branch:** `fix/92-one-dialog-at-a-time`
- **What the agent did:**
  - New `src/features/check-ins/desk-dialogs.ts`: desk dialogs report while they're open (`useDeskDialogOpen`), and the scan popup checks `useOtherDeskDialogOpen`.
  - `ManualCheckIn` reports its open state; `ScanWatcher` stops polling while another desk dialog is open, so the scan popup no longer opens on top of manual check in.
  - Smoke e2e: with manual check in open, a scan doesn't add a second dialog; closing it shows the scan popup.
- **Files touched:** `src/features/check-ins/desk-dialogs.ts`, `src/features/check-ins/components/ScanWatcher.tsx`, `src/features/climbers/components/ManualCheckIn.tsx`, `e2e/smoke.spec.ts`
- **Decisions and why:**
  - Hold the scan rather than drop it: `ScanWatcher` simply doesn't take it while another dialog is open, so it waits in the database and shows when the dialog closes (within the 2 minute limit).
  - A tiny shared store rather than a React context, so any desk dialog can join with one line, wherever it renders.
- **Gotchas:** MUI hides a dialog under another from the accessibility tree, so `getByRole("dialog")` counts one even when two are stacked; the test counts `.MuiDialog-root` instead. With that, the test fails on `dev` without this change.
- **Stacked:** on `fix/91-ignore-old-scans` (both change the same lines of `ScanWatcher`); merge #91 first.
- **Open follow-ups:** Any new desk dialog should call `useDeskDialogOpen(open)`.
- **Verification:** `npm run lint`, `npx tsc --noEmit` clean; `npm test` 83 passed (2 todo); `npm run build` passed; `npx playwright test` 14 passed, 3 skipped (real-login needs seeded Supabase logins).
