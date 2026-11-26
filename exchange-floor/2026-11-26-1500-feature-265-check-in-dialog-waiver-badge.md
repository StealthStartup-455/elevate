# 2026-11-26 15:00 UTC: Check in dialog shows waiver buttons and the pass badge

- **Developer:** Agam Kamran
- **AI tool / model:** Claude Code (claude-sonnet-5-5)
- **Issue / PR:** StealthStartup-455/elevate#265 / PR to follow
- **Branch:** `feature/265-check-in-dialog-waiver-badge`
- **What the agent did:** After a climber is picked in the desk's Check in dialog (scan or search): a **Sign waiver** button when the waiver is missing or expired (links to `/desk/customers/<id>/waiver`, and closes the dialog); a **Look at waiver** button when any signed waiver exists (reuses `DeskWaiverDialog`); and a **Pass** row with the badge (`BadgePill`, from `badgeFor`: Member, Day pass, Punch card or No pass). An expired waiver shows both buttons. `Climber` and `CheckInCandidate` carry `waiverId`.
- **Files touched:** `climbers/types.ts`, `climbers/queries.ts`, `climbers/actions.ts`, `ManualCheckIn.tsx`, `e2e/manual-check-in.spec.ts`.
- **Decisions:** notes, belay status and staff tags are not here: there are no such fields yet, and labels are in #261. Labels can be added to the dialog after #261 merges.
- **Open follow-ups:** labels in the dialog after #261; notes and belay status need new fields.
- **Verification:** lint and `tsc` clean; Playwright manual-check-in: 9 passed (3 new) on a fresh build. Full suite not run.
