# 2026-10-29 06:38 UTC: A signed-in climber at the desk sees a staff-only page

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#87 / PR pending
- **Branch:** `fix/87-staff-only-page`
- **What the agent did:**
  - `requireStaff()` sends someone who is signed in but not staff to `/staff-only`; logged-out visitors still go to `/login`.
  - `proxy.ts`: in demo mode, a climber's demo cookie on `/desk` redirects to `/staff-only` (the proxy used to send it to `/login` before the page's check ran).
  - New `/staff-only` page: "This page is for gym staff", a link to the climber's dashboard, Log out, and a line for staff to log in with their staff account.
  - Tests: `staff.test.ts` (climber, demo climber, login with no rows), smoke e2e (climber lands on the staff-only page and gets back to `/me`), `real-login.spec.ts` expectations, `/staff-only` added to the axe checks.
- **Files touched:** `src/features/auth/{staff,staff.test}.ts`, `src/proxy.ts`, `src/app/staff-only/page.tsx`, `e2e/{smoke,real-login,accessibility}.spec.ts`
- **Decisions and why:** A page rather than a redirect to `/me`: it says why, and covers a signed-in staff member who is missing a Staff row. Server actions still refuse the same way (the redirect throws before any data is touched).
- **Gotchas:** This branch was written while #102 (one Exchange Floor file per entry) was open, so its entry is a file in `exchange-floor/`.
- **Open follow-ups:** None.
- **Verification:** `npm run lint`, `npx tsc --noEmit` clean; `npm test` 84 passed (2 todo); `npm run build` passed; `npx playwright test` 13 passed, 3 skipped (real-login needs seeded Supabase logins). Page checked by eye.
