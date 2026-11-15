# 2026-11-15 01:06 UTC: Error pages only mention an error code when there is one

- **Developer:** @SethMess
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#130 / Pending
- **Branch:** `fix/130-error-page-code`
- **What the agent did:**
  - The part of #130 left after #140: the error page said "let us know the error code below" with no code under it.
  - `errorPageHelp(digest)` in `src/lib/error-page.ts` picks the help line. With a digest: "Try again, and if it keeps happening, let us know the error code below." Without: "Check your connection and try again. If it keeps happening, let us know what you were doing when it happened."
  - `src/app/error.tsx` and `src/app/global-error.tsx` use it; the "Error code: …" line is unchanged and still shows whenever there is a digest.
- **Files touched:** `src/lib/error-page.ts` and `.test.ts` (new), `src/app/error.tsx`, `src/app/global-error.tsx`.
- **Decisions and why:** The code is the digest Next.js gives server errors, matching the line in the server log (`instrumentation.ts`). Errors thrown in the browser (a lost connection, a failed server action call) have no digest and leave nothing in the server log, so a code made up in the browser would point at nothing. The page now stops promising one instead.
- **Gotchas:** The `no-restricted-syntax` raw-color lint rule matches `#130` (and other 3- or 6-digit strings like `"1234567890"`) inside string literals, test titles included. Leave issue numbers out of test titles in `src/`.
- **Open follow-ups:** Logging browser errors to the server (so they could get a code too) would be a separate issue.
- **Verification:** `npm run lint` clean; `npx tsc --noEmit` clean; `npm test` 40 files, 387 passed (2 todo), including the 2 new `errorPageHelp` tests; `npm run build` passed; `npx playwright test e2e/offline.spec.ts` 2 passed. The error page itself was not opened on screen (no e2e reaches it). `npm run test:db` and the full e2e suite were not run.
