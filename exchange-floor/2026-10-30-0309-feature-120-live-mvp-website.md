# 2026-10-30 03:09 UTC: Product demo CTA points to current staging

- **Developer:** @ekamk
- **AI tool / model:** Copilot CLI
- **Issue / PR:** StealthStartup-455/elevate#120 / PR pending
- **Branch:** `feature/120-live-mvp-website`
- **What the agent did:**
  - Updated both product-page “Try the live demo” links to the current staging app.
- **Files touched:** `docs/index.html`
- **Decisions and why:** Used the stable `https://elevate-staging-psi.vercel.app/login` alias shown by the successful staging deploy for PR #116, rather than its per-deployment URL.
- **Gotchas:** The latest deploy log reports Vercel Authentication is enabled for staging, so visitors may be asked to authenticate.
- **Open follow-ups:** Make staging publicly accessible if the product-page demo should work for unauthenticated visitors.
- **Verification:** `rg` confirmed both CTA links target the staging login; `git diff --check` passed.
