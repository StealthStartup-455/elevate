# 2026-11-27 06:58 UTC: Only the picked membership tile is teal

- **Developer:** SethMess
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#248
- **Branch:** `fix/248-membership-selection-colour`
- **What the agent did:**
  - On the climber's Membership tab (`/me/membership`), every membership and pass tile was an outlined teal button with a teal tint, so they all looked picked. Unpicked tiles are now plain (divider border, paper background, normal text); only the picked one is teal, with a thicker teal edge, the ✓ and "in your order".
- **Files touched:** `src/features/purchase/components/PurchaseOptions.tsx` (`Tile`).
- **Decisions and why:** Kept the change in the `Tile`'s `sx`, where its selected style already lived, rather than changing `MuiButton` outlined in `theme.ts`, which every outlined button uses. The desk POS (`ProductPanel`) already had neutral unpicked tiles and is unchanged.
- **Gotchas:** None.
- **Open follow-ups:** None.
- **Verification:** `npm run lint` clean; `npm run build` passes; `npx playwright test e2e/purchase.spec.ts` 8 passed against `npm run dev`. Checked the screen in light and dark mode.
