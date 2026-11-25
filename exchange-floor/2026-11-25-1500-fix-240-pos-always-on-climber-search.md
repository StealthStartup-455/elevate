# 2026-11-25 15:00 UTC: POS climber search is always there

- **Developer:** Agam Kamran
- **AI tool / model:** Claude Code (claude-sonnet-5-5)
- **Issue / PR:** StealthStartup-455/elevate#240 / PR to follow
- **Branch:** `fix/240-pos-always-on-climber-search`
- **What the agent did:** `ClimberPanel` keeps the search field at the top at all times. Typing shows results; otherwise the picked climber shows in a bordered "Selected climber" box, or the renewals and checked-in lists when nobody is picked. "Change climber" and its `onChange` prop are gone. Picking from results replaces the climber.
- **Files touched:** `ClimberPanel.tsx`, `PointOfSale.tsx`, `e2e/pos.spec.ts`, `e2e/release-fixes.spec.ts`.
- **Decisions:** the #255 e2e now picks another climber in place of Change climber; same bug covered. No new styles.
- **Open follow-ups:** none.
- **Verification:** lint and `tsc` clean; Playwright pos, release-fixes, revoke-membership: 11 passed (production build, fresh seed). Full suite not run; light/dark not checked by eye.
