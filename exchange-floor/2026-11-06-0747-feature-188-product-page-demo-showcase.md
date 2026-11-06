# 2026-11-06 07:47 UTC: Separate hero devices and simplify phone screens

- **Developer:** @ekamk
- **AI tool / model:** Copilot
- **Issue / PR:** StealthStartup-455/elevate#188 / none
- **Branch:** `feature/188-product-page-demo-showcase`
- **What the agent did:**
  - Removed the time, signal, Wi-Fi, and battery indicators from both phone mockups.
  - Repositioned the hero phone beside the desk screenshot on wide screens and below it on narrower screens so it no longer covers the desk.
- **Files touched:** `docs/index.html`, `docs/styles.css`
- **Decisions and why:** Kept the Dynamic Island and home indicator as part of the iPhone frame. The mobile/tablet layout stacks the devices to keep both previews readable.
- **Gotchas:** The product page remains intentionally light-only.
- **Open follow-ups:** None.
- **Verification:** `npm run lint`, `npm run build`, and `git diff --check` passed. Browser checks at 320, 390, 680, 960, 1024, 1280, and 1440px passed with no horizontal overflow; devices are separated and all images loaded. Verified no status-bar markup remains.
