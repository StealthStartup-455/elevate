# 2026-10-29 18:49 UTC: Version moves from every page's footer to the desk and About on /me

- **Developer:** @SethMess
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#103 / PR pending
- **Branch:** `feature/103-version-about`
- **What the agent did:**
  - Root layout no longer renders `<AppVersion />`; the desk layout does, after `<main>`.
  - `AppVersion.tsx` now also exports `VersionLink` (the version, linking to its commit, `data-testid="app-version"`). `/me` ends with "About: Elevate <version>".
  - `e2e/version.spec.ts`: the desk and About on /me match `/api/version`; login and join show no version.
  - Comments and docs that said "footer of every page" (`DEPLOYMENT.md`, `CONTRIBUTING.md`, `deploy-staging.yml` comment, `src/lib/version.ts`, `/api/version` route).
- **Files touched:** `src/app/layout.tsx`, `src/app/desk/layout.tsx`, `src/app/me/page.tsx`, `src/components/ui/AppVersion.tsx`, `e2e/version.spec.ts`, docs above
- **Decisions and why:**
  - Same in every environment, not hidden only in production: one behaviour to test, and staging screenshots of the desk still carry the version.
  - About is a line at the bottom of `/me`, not a new page or menu: there is no account menu yet; it is one scroll, no tap.
  - `/api/version` unchanged and public (the deploy check needs it).
- **Gotchas:** #81 also edits `src/app/desk/layout.tsx` (the nav links); the change here is one import and one line after `<main>`, so a conflict is trivial.
- **Open follow-ups:** Move About into an account menu if one is added.
- **Verification:** `npm run lint` clean; `npm test` 86 passed; `npm run build` ok; `npx playwright test` 14 passed, 3 skipped (real Supabase logins not set up locally). Checked /me (phone) and /desk in light and dark.
