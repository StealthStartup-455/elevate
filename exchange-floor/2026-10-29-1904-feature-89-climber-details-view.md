# 2026-10-29 19:04 UTC: Desk climber page shows details read-only, with Edit

- **Developer:** @SethMess
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#89 / PR pending
- **Branch:** `feature/89-climber-details-view` (stacked on `feature/88-desk-add-climber-waiver`)
- **What the agent did:**
  - New client component `ClimberDetails.tsx`: phone, email and date of birth as a read-only list with an outlined **Edit** button that swaps in `ClimberForm` (Save changes / Cancel). After a save it goes back to the view with "Saved.".
  - `/desk/climbers/[climberId]` uses it; the waiver row and waiver step are passed as children and hidden while editing. `?edit=1` opens the page in the form.
  - `ClimberTable` has an **Edit** link per row (`aria-label="Edit <name>"`) to `?edit=1`.
  - New `e2e/climber-details.spec.ts`: view is read-only, Edit then Save shows the new name; the table's Edit link opens the form, Cancel returns to the view.
- **Files touched:** `src/features/climbers/components/{ClimberDetails,ClimberTable}.tsx`, `src/app/desk/climbers/[climberId]/page.tsx`, `e2e/climber-details.spec.ts`
- **Decisions and why:**
  - Edit on the page is a button that toggles state, not a link: it is an action on this page (STYLE_GUIDE: a button that navigates should be a link, and this one doesn't). The table's Edit opens another page, so it is a link.
  - The waiver step hides while editing so the card never has two contained buttons (Sign + Save).
  - `updateClimber` is unchanged; the client wraps it and leaves edit mode on success. `revalidatePath` refreshes the details.
- **Gotchas:** `?edit=1` stays in the URL after Cancel or Save; a reload reopens the form. Harmless. The page's own server component was renamed `ClimberCard` to free the name.
- **Open follow-ups:** None.
- **Verification:** `npm run lint` clean; `npm test` 86 passed; `npm run build` ok; `npx playwright test` 16 passed, 3 skipped (real Supabase logins not set up locally); the two new specs plus #88's passed 9/9 with `--repeat-each=3`. Checked the page and table in light and dark.
