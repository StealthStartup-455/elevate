# 2026-11-06 16:37 UTC: Show complete desk captures and tidy holds on phones

- **Developer:** @ekamk
- **AI tool / model:** Copilot (Auto)
- **Issue / PR:** StealthStartup-455/elevate#188 / no PR opened
- **Branch:** `feature/188-product-page-demo-showcase`
- **What the agent did:** Fixed side cropping in the feature front-desk reel on phones. Reduced section holds to 40px on phones and moved the climber/FAQ top holds into their upper whitespace. Updated the stylesheet cache hash.
- **Files touched:** `docs/styles.css`, `docs/index.html`, this entry.
- **Decisions and why:** The old mobile reel ratio of 1.28 combined with `object-fit: cover` cropped the 3072-by-2241 captures horizontally. At widths up to 680px, the reel now uses their exact aspect ratio and `contain`, preserving every capture's complete image. A shared optional hold-size variable retains existing desktop/tablet sizes while reducing phone decorations; existing hero hold sizing and placement are preserved.
- **Gotchas:** Initial browser assertions needed to account for reduced-motion frames being hidden and an existing 29px horizontal overflow at 768px. The latter is unchanged from the pre-edit baseline and outside this phone-only adjustment. Desktop/tablet layouts and hold positions were preserved.
- **Open follow-ups:** Existing 768px horizontal overflow remains. No commit, push or PR for this iteration.
- **Verification:** `npm run lint` and `git diff --check` passed. A temporary Playwright verifier checked 320, 375, 390, 430, 680, 768, 960, 1024 and 1440px in light/dark system preferences: all eighteen cases passed. All three mobile desk frames fit fully with zero side crop; phone holds have no text overlap or horizontal clipping, including the bottom FAQ hold with every answer expanded. Phone pages have no horizontal overflow. Copy is unchanged; desktop/tablet layout and hold bounds exactly match the pre-edit baseline. Reduced motion shows only the first frame; no browser/HTTP errors. Inspected full phone pages, close-up desk captures, hero/climber decorations and the dark-preference FAQ. Build not run for this static CSS/HTML-only adjustment.
