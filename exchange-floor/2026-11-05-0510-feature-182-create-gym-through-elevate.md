# 2026-11-05 05:10 UTC: Create an Elevate gym and customer gym discovery

- **Developer:** @ekamk
- **AI tool / model:** Copilot CLI (GPT-5.6 Terra)
- **Issue / PR:** StealthStartup-455/elevate#182 / PR pending
- **Branch:** `feature/182-create-gym-through-elevate`
- **What the agent did:**
  - Added customer account signup and gym-owner signup/login, including demo-owner credentials and legacy demo-gym reclaim.
  - Added customer gym discovery, joining, registration, and switching between gym-scoped customer records.
  - Added pending demo-customer onboarding and active-climber sessions; demo sessions remember multiple joined gyms for Explore labels and switching.
  - Kept `/join` working by redirecting it to customer signup.
  - Fixed `/me` busyness and saved check-ins to use the active customer record's gym.
- **Files touched:** `src/app/{signup,gym,join,me}`, `src/features/{auth,gyms,climbers}`, `src/components/climber/`, `prisma/schema.prisma`, `prisma/migrations/20261105053246_customer_account_username/`, `prisma/migrations/20261105063450_demo_customer_onboarding/`, `prisma/migrations/20261105070700_demo_gym_owner_credentials/`.
- **Decisions and why:** Onboarding is Elevate-managed for now; customers choose a gym after creating their account. New demo customers stay pending until they select their gym.
- **Gotchas:** New request-scoped Prisma reads under cache components need `Suspense` and `await connection()`. Clear demo cookies after real signup so they cannot override the Supabase session.
- **Open follow-ups:** Add external-system connection workflows if scoped.
- **Verification:** `npx prisma migrate deploy`, `npx prisma generate`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed. `npm test` passed (396 tests, 2 todo). Browser smoke tests covered customer signup/join and demo gym-owner login.
