# 2026-11-06 15:56 UTC: Add contact icons and clarify marketing copy

- **Developer:** @ekamk
- **AI tool / model:** Copilot (Auto)
- **Issue / PR:** StealthStartup-455/elevate#188 / no PR opened
- **Branch:** `feature/188-product-page-demo-showcase`
- **What the agent did:** Added an envelope icon beside the bottom email link and the Elevate logo as the browser-tab icon. Replaced the desk headline with "Less admin. More time for climbers." Restored "Have another question? Email us." beneath the FAQ heading using dev's invitation styling.
- **Files touched:** `docs/index.html`, `docs/styles.css`, `docs/assets/brand/icon.png`, this entry.
- **Decisions and why:** Reused the app's existing 512px teal logo instead of creating a different brand asset. The envelope inherits text colour and is decorative, so it does not duplicate the email link's accessible name. FAQ contact uses email, not GitHub Issues. Preserved the smaller phone card, screenshots and developer's other copy edits.
- **Gotchas:** Refreshed the CSS query hash so local reloads request current styles. The standalone marketing page stays light under dark system preferences.
- **Open follow-ups:** None. Work remains uncommitted; no PR opened.
- **Verification:** `npm run lint`, `npm run build`, `git diff --check` and `cmp src/app/icon.png docs/assets/brand/icon.png` passed. Playwright loaded and decoded the favicon as 512x512 PNG; checked headline, FAQ email link, decorative envelope semantics, four email links and matching CSS hash. Responsive checks passed at seven widths under light/dark preferences, including no overflow and icon/email alignment. FAQ link keyboard focus shows its outline. Inspected desktop/mobile contact and FAQ screenshots, the new desk heading and dark-preference contact rendering. No HTTP or browser errors; temporary browser/server closed.
