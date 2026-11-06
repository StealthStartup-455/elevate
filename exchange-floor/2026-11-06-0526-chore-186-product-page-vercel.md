# 2026-11-06 05:26 UTC: Deploy the product page through Vercel

- **Developer:** @ekamk
- **AI tool / model:** Copilot (GPT-5.6 Terra)
- **Issue / PR:** StealthStartup-455/elevate#186 / Pending
- **Branch:** `chore/186-product-page-vercel`
- **What the agent did:**
  - Replaced the GitHub Pages workflow with a Vercel deployment for the static `docs/` product page.
  - Kept deployment automatic for `docs/` changes merged to `dev`, with a manual dispatch option.
  - Documented isolated `product-page` environment secrets, custom-domain setup, and GitHub Pages retirement.
- **Files touched:** `.github/workflows/deploy-product-page.yml`, `.github/workflows/deploy-pages.yml`, `DEPLOYMENT.md`
- **Decisions and why:** The Vercel project remains disconnected from GitHub so Actions is the sole deployment trigger; the workflow safely skips until Vercel credentials are configured.
- **Gotchas:** `npm run build` initially read stale `.next/dev` route validators; it passed after clearing the ignored generated `.next` cache.
- **Open follow-ups:** Create the Vercel product-page project, configure the three `product-page` environment secrets, attach the preferred domain, and disable GitHub Pages after the first deployment.
- **Verification:** `ruby -e 'require "yaml"; ARGV.each { |f| YAML.load_file(f); puts "valid YAML: #{f}" }' .github/workflows/deploy-product-page.yml` passed; `npm run lint` passed; `npm run build` passed after removing stale `.next`.
