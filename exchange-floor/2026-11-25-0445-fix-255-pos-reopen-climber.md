# 2026-11-25 04:45 UTC: POS opens the climber again after Change climber

- **Developer:** @SethMess
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#255 / PR to follow
- **Branch:** `fix/255-pos-reopen-climber`
- **What the agent did:**
  - `PointOfSale` is now a small wrapper that keys the POS on the climber id and `useRouter().bfcacheId` when opened for a climber (`?climber=`), so each fresh link to it (the Check-in panel's POS button, Open in POS on a climber's page) starts with that climber. Opened with nobody, the key stays `"nobody"`, as before.
  - New e2e in `e2e/pos.spec.ts`: open Nevin Gill from the Check-in panel, Change climber, then open him from the panel again. It fails without the fix.
- **Files touched:** `src/features/pos/components/PointOfSale.tsx`, `e2e/pos.spec.ts`.
- **Decisions and why:**
  - Cause: with `cacheComponents`, Next.js keeps recently visited pages alive in React `<Activity>` and restores their state (`node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`). The server key (`picked?.id`) only resets the POS when the id changes, so coming back to the same `?climber=` restored "nobody" or whoever was picked last.
  - Tried first: `router.replace` to keep `?climber=` in step with the picked climber. Dropped: each pick then waits on a server round trip and remounts the POS, and text typed into the search meanwhile was lost. `bfcacheId` needs no server trip and leaves picking inside the POS as it was. Next's docs call `bfcacheId` a last resort; here no event handler sees the navigation, which is the case it's for.
  - Back and forward still restore a sale in progress (`bfcacheId` doesn't change for them).
- **Gotchas:** In a new worktree, `tsc` reports 26 errors on `PageProps` until `npx next typegen` runs. The Check-in page keeps its state too, so the e2e clears "Find climber" before searching again. #240 would remove Change climber, but Back to POS after a sale hits the same bug, so this is still needed.
- **Open follow-ups:** None.
- **Verification:** `npm run lint` clean; `npx tsc --noEmit` clean (after `npx next typegen`); `npm run build` passed (second run; the first stops on the Next.js security notice). Full Playwright suite on a freshly migrated and seeded local Postgres (DEMO_MODE, production build, run against `next start` on port 3100): 87 passed, 4 skipped (real-login, and the specs that skip with `E2E_BASE_URL` set or when the seed has few check-ins for today). The new test failed with the fix removed (`Nevin Gill` not found after reopening). Also checked by hand against the dev server: after picking someone else, and that the POS search still works.
