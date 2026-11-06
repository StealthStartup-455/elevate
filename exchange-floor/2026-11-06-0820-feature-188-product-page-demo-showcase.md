# 2026-11-06 08:20 UTC: Enlarge hero and front-desk feature reels

- **Developer:** @ekamk
- **AI tool / model:** Copilot
- **Issue / PR:** StealthStartup-455/elevate#188 / no PR opened at developer's request
- **Branch:** `feature/188-product-page-demo-showcase`
- **What the agent did:** Removed the Check-in, POS and Calendar captions beneath the feature desk reel. Moved hero devices below the copy and expanded the feature desk reel to a full-width row. Enlarged the hero phone to match the feature phone, stacking hero devices at narrower widths without overlap.
- **Files touched:** `docs/index.html`, `docs/styles.css`, this entry.
- **Decisions and why:** At 1440px the hero desk image is approximately 950px wide (previously 667px), the feature desk image is 1234px (previously 770px), and the hero phone screen is approximately the feature phone's size. The existing high-resolution assets and feature climber reel are unchanged. Replaced tall, rotated decorative hero ellipses with bounded circles to prevent overflow as the devices grow.
- **Gotchas:** The static marketing page retains its existing standalone CSS and light-only appearance. On narrow screens the devices stack to preserve available screenshot width.
- **Open follow-ups:** None.
- **Verification:** `npm run lint`, `npm run build`, and `git diff --check` passed. Browser checks at 320, 390, 680, 960, 1024, 1280 and 1440px found no horizontal overflow. Inspected desktop and mobile captures, including dark system mode. All 12 reel image references loaded; verified each reel's three animation phases and the reduced-motion first-frame fallback.
