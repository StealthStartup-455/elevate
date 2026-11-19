# 2026-11-19 04:02 UTC: Fix CI onboarding checkbox ambiguity

- **Developer:** @ekamk
- **AI tool / model:** GitHub Copilot CLI / GPT-6.1 Sol
- **Issue / PR:** StealthStartup-455/elevate#182 / #183
- **Branch:** `feature/182-create-gym-through-elevate`
- **What the agent did:** Investigated failed CI run `44453382207`: 83 browser tests passed, three skipped, and the new onboarding journey failed on both attempts because its waiver-confirmation label matched a hidden streamed copy as well as the visible checkbox. Replaced that selector with an exact accessible checkbox-role selector.
- **Files touched:** `e2e/gym-onboarding.spec.ts` and this entry.
- **Decisions and why:** Accessible-role queries exclude hidden streamed content and still enforce uniqueness. Do not use `.first()`, remove assertions, or loosen timeouts/retries to hide this ambiguity. No application or CI configuration changes were needed.
- **Gotchas:** Next.js partial prerendering can temporarily retain a hidden copy of a form. `getByLabel` can match both copies even when only one control is visible.
- **Open follow-ups:** GitHub CI must verify the pushed repair; human review remains required.
- **Verification:** `npm run lint`, `npm run build`, and `git diff --check` passed. `CI=true E2E_BASE_URL=http://localhost:3110 node node_modules/@playwright/test/cli.js test e2e/gym-onboarding.spec.ts --repeat-each=2 --retries=0 --reporter=list --output=test-results/ci-selector-fix`: four passed against the production build and an isolated task-owned seeded Postgres database. A direct Playwright reproduction inserted a hidden copy of the real confirmation label: the previous label selector matched two inputs and failed strict mode; the new exact-role selector matched one and successfully checked it.
