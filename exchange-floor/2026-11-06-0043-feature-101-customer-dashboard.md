# 2026-11-06 00:43 UTC: Plan card says "Renews" for a recurring plan (review nit on #176)

- **Developer:** @Scott-Squires
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#101 / #176
- **Branch:** `feature/101-customer-dashboard`
- **What the agent did:**
  - Addressed Seth's review nit: the Membership tab's `PlanCard` always said "Runs until", so a monthly recurring member could read it as their plan ending. Its date line now goes through the shared `membershipDateLine` (`climbers/format.ts`), like the desk climber page, POS climber card, manual check-in and scan popup: "Renews" for a recurring plan, "Runs until" for a one-off one (#132), "Ended" once expired.
  - Seth's other comment (the conflicts after #174) was already handled by the dev merge in cc48cef; the PR is mergeable with nothing new on `dev`.
- **Files touched:** `src/features/purchase/components/PlanCard.tsx`.
- **Decisions and why:**
  - Reused `membershipDateLine` instead of Seth's inline suggestion, so the climber app and the desk can't drift apart again.
  - Kept `PlanCard`'s own "Paused" line: the helper returns nothing for a paused plan (#124), but the card has always said "Paused" there.
  - The date is still the current pass's end (its own name and dates) when the gym sells in the app, and the membership's date otherwise; an expired plan uses the membership's date, as before. An expired plan with no date now shows no line instead of "Runs until" a pass date.
- **Gotchas:** Most seeded memberships have `renews = false` (see the #149 entry), so most demo climbers still read "Runs until". Only the seeded "Renewals due" members (`renewsInDays`) and a "Monthly recurring membership" bought in demo mode read "Renews".
- **Open follow-ups:** None for this nit. Seth asked for an extra look at the calendar code (his part) before merge.
- **Verification:** `npm run lint` clean; `npx tsc --noEmit` clean; `npm test` 39 files, 385 passed (2 todo; `membershipDateLine` already has unit tests); `npm run build` passed. Not checked on screen with a recurring member; e2e and database tests not run here (CI runs them on push).
