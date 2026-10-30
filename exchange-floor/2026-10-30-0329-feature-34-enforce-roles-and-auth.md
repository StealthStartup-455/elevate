# 2026-10-30 03:29 UTC: enforce staff and gym authorization

- **Developer:** @ekamgill
- **AI tool / model:** GitHub Copilot CLI
- **Issue / PR:** StealthStartup-455/elevate#34 / PR pending
- **Branch:** `feature/34-enforce-roles-and-auth`
- **What the agent did:**
  - Added active staff-role guards and a staff context that scopes actions and reads to the staff row's gym.
  - Preserved the demo desk's default-gym context, while real member reads are limited to climbers linked to that login.
  - Restricted desk actions, scan handling and climber lookups to the authorized gym.
- **Files touched:** `src/features/auth/queries.ts`, `src/features/auth/staff.ts`, `src/features/climbers/actions.ts`, `src/features/climbers/queries.ts`, `src/features/climbers/day-pass.db.test.ts`, `src/features/check-ins/actions.ts`, `src/features/auth/staff.test.ts`, `src/features/auth/actions.test.ts`
- **Decisions and why:**
  - Real staff authorization uses an active `Staff` row; desk, manager and owner roles can use staff workflows.
  - Cross-gym access is rejected at the server action/data query layer, regardless of what the interface displays.
- **Gotchas:**
  - Demo login remains a demo-only exception and uses `demo-gym`; production authorization requires a real active staff or linked climber record.
  - No gym-creation or active-gym selection flow was added. A user associated with multiple gyms still needs an explicit gym-specific sign-in/selection flow.
- **Open follow-ups:** Build gym creation and a trusted way for a user to sign in to or select a specific gym when associated with more than one.
- **Verification:** `npm test` passed (92 passed, 2 todo); `npm run test:db` passed (15 tests, including the cross-gym regression case); focused auth tests passed (13 tests); `npx tsc --noEmit`, `git diff --check`, `npm run lint` and `npm run build` passed.
