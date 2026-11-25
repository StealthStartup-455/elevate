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

## Update (same branch)

- The search moved into the page header beside "Point of sale" (`ClimberSearch.tsx`): a larger bar whose dropdown holds fuzzy results, renewals due and today's check-ins. While it is open, only the sale area below is blurred (not the nav); picking someone closes it and shows them unblurred. The picked climber's card has a placeholder avatar (`ClimberPanel.tsx`).
- Also in this PR, a different bug: "New customer" from the Check-in tab links to `/desk/customers/new?from=check-in`, so its back link reads "← Check-in" and goes to `/desk`; from Customers it stays "← Customers".
- Verification: lint, `tsc` clean; Playwright pos, release-fixes, eft, demo-fixes, revoke-membership, desk-add-climber: 17+ passed (production build). Full suite not run.
