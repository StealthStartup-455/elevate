# 2026-10-30 05:23 UTC: Revoke membership on the POS climber card

- **Developer:** @zack122
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate-docs#56 / #119
- **Branch:** `feature/56-mock-membership-purchase-workflow-staff-side`
- **What the agent did:**
  - New server action `revokeMembership(climberId)` in `src/features/pos/actions.ts`: every membership pass that hasn't ended stops now (a renewal bought early ends at its own start, the same rule as void's `voidedExpiry`), and `renews` is cleared so it doesn't show under "Renewals due". Logs `membership_revoked`.
  - The POS climber card (`ClimberPanel.tsx`) shows an outlined **Revoke membership** button when the picked climber's membership is active or paused, with a confirm dialog.
  - DB tests for revoke (ends current and early renewal, sales stay paid, punch cards untouched, staff only).
  - Fixed the POS DB test mocks, which broke when #123 was merged in (`getStaffContext`, `getGymById`, `getCurrentUser` missing): 11 tests were failing before this change.
- **Files touched:** `src/features/pos/{actions.ts,actions.db.test.ts,README.md}`, `src/features/pos/components/ClimberPanel.tsx`
- **Decisions and why:**
  - Revoke moves no money and leaves the sale paid; a refund is still a void. Keeps the two ideas separate.
  - No reason is stored: `Pass` has no column for it and a migration felt too heavy for this. The confirm dialog is the only guard.
  - Any desk staff member can revoke, like void.
- **Gotchas:** After revoking, the climber shows "Membership expired · Ended <today>", not a distinct "revoked" state; nothing records that it was revoked rather than ended.
- **Open follow-ups:** Store who revoked and why (needs a schema change and staff id from auth). Maybe offer Revoke on `/desk/climbers/[id]` too.
- **Verification:** `npm run lint` and `npx tsc --noEmit` clean; `npm test` 135 passed (2 todo); `npm run test:db` 32 passed (after `prisma migrate deploy` applied this branch's two pending migrations locally); `npm run build` passed. Not checked in a browser: Playwright's Chromium isn't installed on this machine, so light/dark screenshots weren't taken.
