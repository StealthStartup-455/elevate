# 2026-11-06 05:26 UTC: Deploy the product page through Vercel

- **Developer:** @ekamk
- **AI tool / model:** Copilot (GPT-5.6 Terra)
- **Issue / PR:** StealthStartup-455/elevate#186 / Pending
- **Branch:** `chore/186-product-page-vercel`
- **What the agent did:**
  - Replaced the GitHub Pages workflow with Vercel Git integration for the static `docs/` product page.
  - Added static-site configuration so the product-page project does not inherit the repository's Next.js configuration.
  - Documented Vercel project, branch, custom-domain, and GitHub Pages retirement setup.
- **Files touched:** `.github/workflows/deploy-pages.yml`, `docs/vercel.json`, `DEPLOYMENT.md`
- **Decisions and why:** Vercel Git integration deploys the product page after pushes to `dev`; it is simpler than keeping Actions credentials for a static site.
- **Gotchas:** `npm run build` initially read stale `.next/dev` route validators; it passed after clearing the ignored generated `.next` cache.
- **Open follow-ups:** Merge this change, then redeploy the Vercel project, attach the preferred domain, and disable GitHub Pages after the first deployment.
- **Verification:** `node -e 'JSON.parse(require("fs").readFileSync("docs/vercel.json", "utf8"))'`, `npm run lint`, and `npm run build` passed.
