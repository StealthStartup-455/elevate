# 2026-11-15 01:03 UTC: Demo QR code holds the member code instead of the song link

- **Developer:** @SethMess
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#151 / Pending
- **Branch:** `fix/151-demo-qr-member-code`
- **What the agent did:**
  - `DemoQrCode` in demo mode now encodes the climber's member code (`ELV-…`, the `value` it is given) instead of the class-demo song link from #146. Removed `DEMO_QR_LINK`.
  - Outside demo mode it is still the non-scanning placeholder; check-in still goes through "Simulate scan".
  - `e2e/release-fixes.spec.ts`: the #146 test now checks the drawn code is exactly the QR code for the member code in its label (viewBox size and dark module count from `qrcode`), instead of "bigger than the placeholder".
- **Files touched:** `src/features/climbers/components/DemoQrCode.tsx`, `src/features/climbers/README.md`, `e2e/release-fixes.spec.ts`.
- **Decisions and why:**
  - Member code rather than the product page: #151 suggests it, and it is what a real desk scanner would read for #223.
  - No flag for the joke link: #151 allows one off by default, but nothing needs it.
  - The demo-mode-only split is unchanged, so this changes nothing outside demo mode.
- **Gotchas:** A member code is a small QR code (21 modules, viewBox 25), smaller than the 25-module placeholder (viewBox 29), so the old "bigger than the placeholder" assertion no longer holds.
- **Open follow-ups:** #223 (a real desk scan reading this code) is unchanged.
- **Verification:** `npm run lint` clean; `npx tsc --noEmit` clean (after `npx next typegen`); `npm test` 39 files, 385 passed (2 todo); `npm run build` passed; `npx playwright test e2e/release-fixes.spec.ts` 6 passed (demo mode, local Postgres, seeded). A screenshot of the code on `/me/check-in` decodes with `zbarimg` to `ELV-FEC33F`, the code in its label. `npm run test:db` and the full e2e suite were not run.
