# 2026-10-29 18:56 UTC: Adding a climber at the desk opens their page with the waiver step

- **Developer:** @SethMess
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#88 / PR pending
- **Branch:** `feature/88-desk-add-climber-waiver`
- **What the agent did:**
  - `createClimberAtDesk` redirects to `/desk/climbers/<id>?added=1` instead of the climber table.
  - The climber page shows "Climber added." (plus "Next, their waiver." when it isn't valid) for `?added=1`, and the waiver step gets a **Later** button back to the climber list.
  - `WaiverStep` takes an optional `laterHref`.
  - New `e2e/desk-add-climber.spec.ts`: add at the desk, land on the page, see Later, sign, badge turns valid.
- **Files touched:** `src/features/climbers/actions.ts`, `src/app/desk/climbers/[climberId]/page.tsx`, `src/features/climbers/components/WaiverStep.tsx`, `e2e/desk-add-climber.spec.ts`
- **Decisions and why:**
  - A query flag (`?added=1`), not state: the redirect comes from a server action, and a reload keeps the message, which is harmless.
  - "Later" goes back to `/desk/climbers`, where staff came from. The waiver step still shows whenever they open the climber again, as before.
  - New e2e file rather than `smoke.spec.ts`, which #106 and #108 both edit.
- **Gotchas:** On the desk, `getByLabel("First name")` matches two elements; the test uses `getByRole("textbox", { name })`. The card still has two contained buttons (Sign + Save changes), as before; #89 (stacked on this branch) makes the details read-only, which removes the always-open form.
- **Open follow-ups:** None.
- **Verification:** `npm run lint` clean; `npm test` 86 passed; `npm run build` ok; `npx playwright test` 14 passed, 3 skipped (real Supabase logins not set up locally). Checked the page in light and dark.
