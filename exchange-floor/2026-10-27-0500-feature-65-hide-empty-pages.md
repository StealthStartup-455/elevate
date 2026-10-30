# 2026-10-27 05:00 UTC: Empty pages hidden from the desk and climber menus

- **Developer:** @guerrerj
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#65 / #81
- **Branch:** `feature/65-hide-empty-pages`
- **What the agent did:**
  - Desk menu: Events and Waivers links removed. Climber menu: Events and Stats links removed. A comment in each layout says to add a link back in the PR that fills its page.
  - `e2e/navigation.spec.ts`: each menu shows its working links, leaves out the empty pages, and the empty routes still load.
- **Files touched:** `src/app/desk/layout.tsx`, `src/app/me/layout.tsx`, `e2e/navigation.spec.ts`
- **Decisions and why:** Removed the links rather than adding a feature flag: four links, and a flag would outlive the pages it hides. The routes and pages are untouched (#65 asks for that), and `accessibility.spec.ts` still checks them.
- **Gotchas:** Whoever builds Events, Waivers or Stats must add the menu link back and update `e2e/navigation.spec.ts`, which otherwise fails.
- **Open follow-ups:** None.
- **Verification:** `npm run lint` and `npx tsc --noEmit` clean; `npm run build` passed; `npx playwright test` 14 passed, 3 skipped (real-login needs seeded Supabase logins). The two new tests failed against the old menus, as intended.
