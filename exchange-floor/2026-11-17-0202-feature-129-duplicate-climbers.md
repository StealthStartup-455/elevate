# 2026-11-17 02:02 UTC: Warn about possible duplicate climbers

- **Developer:** @SethMess
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#129 / PR to follow
- **Branch:** `feature/129-duplicate-climbers`
- **What the agent did:**
  - Add climber and `/join` look for a possible duplicate before saving (`findPossibleDuplicates` in `src/features/climbers/queries.ts`). A match returns `status: "duplicate"` with nothing saved; `ClimberForm` shows a warning and an "Add anyway" / "Create a new account anyway" button that sends `confirmDuplicate`.
  - On the desk the warning lists who matched (name, phone, birthday) with an Open link.
  - Manual check in shows the birthday beside the phone, in the results and for the picked climber (`CheckInCandidate.dateOfBirth`).
- **Files touched:** `src/features/climbers/{actions,queries,types}.ts`, `src/features/climbers/components/{ClimberForm,ManualCheckIn}.tsx`, `src/app/join/page.tsx`, `src/features/climbers/README.md`, `src/features/climbers/duplicates.db.test.ts`, `e2e/duplicate-climbers.spec.ts`.
- **Decisions and why:**
  - Desk rule: the same phone, or the same name and birthday, as #129 asks. A shared family phone matches, so staff always see who and can still add.
  - `/join` is stricter than the issue: the same name and either the phone or the birthday, and the warning names nobody. `/join` is public, so a phone number alone must not reveal that its owner climbs at this gym.
  - The desk's confirm value is the sorted matched ids, so a form edited after the warning to match someone else warns again. `/join` uses a fixed value, so it reveals no ids.
  - The Customers list already has a Born column (md and up), so it was left as is.
  - Edit climber (`updateClimber`) does not check: #129 only covers creating.
- **Gotchas:** The footer's version link is named "…opens the commit on GitHub", so `getByRole("link", { name: "Open" })` matches it too; use `exact: true`. e2e data must be unique per run (the spec builds phones from `Date.now()`), or earlier runs' climbers match the warning.
- **Open follow-ups:** None. #128 (demo usernames for same-name climbers) is separate.
- **Verification:** `npm run lint` clean; `npx tsc --noEmit` clean; `npm test` 42 files, 400 passed (2 todo); `npm run test:db` 10 files, 119 passed, including 9 new in `duplicates.db.test.ts`; `npm run build` passed. Full Playwright suite on a freshly migrated and seeded database (DEMO_MODE, production build), rebased on dev after #228: 84 passed, 3 skipped, including the 2 new in `e2e/duplicate-climbers.spec.ts` (each also passed twice more on a reused database). Desk and `/join` warnings checked in screenshots in light and dark, `/join` at 390 px.
