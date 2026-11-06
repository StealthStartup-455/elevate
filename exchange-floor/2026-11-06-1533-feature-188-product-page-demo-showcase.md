# 2026-11-06 15:33 UTC: Version the marketing stylesheet request

- **Developer:** @ekamk
- **AI tool / model:** Copilot (Auto)
- **Issue / PR:** StealthStartup-455/elevate#188 / no PR opened
- **Branch:** `feature/188-product-page-demo-showcase`
- **What the agent did:** Added a content-hash query parameter to the HTML stylesheet URL so reloading requests the current dev-style CSS rather than an older cached URL.
- **Files touched:** `docs/index.html`, this entry.
- **Decisions and why:** Preserved all saved content and styling. The updated files are local uncommitted work; a local static server does not require a push to serve them.
- **Gotchas:** The developer views `http://localhost:8000/#product`. One fetch returned HTML and CSS identical to the current files, but subsequent requests and a fresh browser could not connect. Browser caching is a possible explanation, not a confirmed diagnosis. Update the query hash when changing CSS if cache invalidation is needed again.
- **Open follow-ups:** The developer must reload the local page with their static server running to confirm their browser's appearance. No PR opened.
- **Verification:** `npm run lint`, `npm run build` and `git diff --check` passed. Playwright against a temporary HTTP server confirmed the query matches the stylesheet hash and loads on initial navigation and reload. Lime buttons, coloured feature bands and no horizontal overflow passed at seven widths under light and dark system preferences. Temporary server and browser were closed.
