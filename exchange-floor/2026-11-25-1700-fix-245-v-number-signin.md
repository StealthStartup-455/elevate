# 2026-11-25 17:00 UTC: Student ID (V#) is optional

- **Developer:** Agam Kamran
- **AI tool / model:** Claude Code (claude-sonnet-5-5)
- **Issue / PR:** StealthStartup-455/elevate#245 / PR to follow
- **Branch:** `fix/245-v-number-signin`
- **What the agent did:** `Climber.studentId` is nullable (migration `20261125150000_climber_student_id_optional`; the unique index stays, Postgres allows many NULLs). Customer signup, the desk add/edit form and gym copy accept it blank (stored as null by `storedStudentId`); a filled one must still be V + 8 digits and unique. A climber with none sees a note instead of a barcode on Check in; desk details show "None". Seed adds Riley Outsider with no V#.
- **Files touched:** schema + migration, `student-id.ts`, `validate.ts`, `actions.ts` (climbers, auth, gyms), `types.ts`, forms, `CheckInCard.tsx`, `ClimberProfile.tsx`, `ClimberDetails.tsx`, seed, tests, README.
- **Decisions:** `ClimberInput.studentId` stays a string ("" = none) so forms don't change shape. Invalid scanned barcodes already say "That isn't a student ID barcode."
- **Gotchas:** a dev server started before `prisma generate` keeps the old client and fails on null; restart it. Playwright reuses a server on port 3000. The lint rule reads `#245` inside a string as a hex color.
- **Open follow-ups:** none.
- **Verification:** lint and `tsc` clean; `npm test` 452 passed; `npm run test:db` 131 passed; build passes; Playwright manual-check-in, gym-onboarding, desk-add-climber, climber-details, release-fixes, duplicate-climbers, pos: 21 passed. Full e2e not run.
