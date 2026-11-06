# 2026-11-06 08:33 UTC: Restore compact reels with clearer desk captures

- **Developer:** @ekamk
- **AI tool / model:** Copilot
- **Issue / PR:** StealthStartup-455/elevate#188 / no PR opened at developer's request
- **Branch:** `feature/188-product-page-demo-showcase`
- **What the agent did:** Restored the hero and feature desk sizing and layouts from before the 08:20 enlargement. Kept the desk captions removed. Recaptured all three desk screens with a tighter viewport and higher pixel density to improve text legibility without enlarging the devices.
- **Files touched:** `docs/styles.css`, `docs/assets/{front-desk,desk-pos,desk-events}.png`, this entry.
- **Decisions and why:** Captured the actual hosted demo at 1024×747 CSS pixels and device scale factor 3, producing 3072×2241 images. Relative to the previous 1440px captures, text occupies about 41% more of the image width while preserving the desktop POS and events layouts. Phone screenshots remain the existing 3x mobile captures. At a 1440px page width, hero desk/phone and feature desk widths are restored to approximately 667px, 230px and 770px.
- **Gotchas:** A trial capture at 960px switched POS to a stacked layout, hiding the cart; it was rejected in favor of the 1024px desktop breakpoint. Only fictional demo data was captured; no transactions were created.
- **Open follow-ups:** None.
- **Verification:** `npm run lint`, `npm run build`, and `git diff --check` passed. Browser checks at 320, 390, 680, 960, 1024, 1280 and 1440px confirmed no horizontal overflow, no restored captions and all reel images loaded. Inspected the restored hero and feature desk captures at actual display sizes, including dark system mode on the intentionally light-only page.
