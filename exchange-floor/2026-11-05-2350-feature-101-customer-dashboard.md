# 2026-11-05 23:50 UTC: Merge dev (#179 EFT, #181 waiver editor, #178 cash out) into the climber app branch

- **Developer:** @Scott-Squires
- **AI tool / model:** Claude Code (claude-opus-5-5)
- **Issue / PR:** StealthStartup-455/elevate#101 / #176
- **Branch:** `feature/101-customer-dashboard`
- **What the agent did:**
  - Merged `origin/dev` at 8e076b7 into this branch. Six files conflicted; everything else merged on its own.
  - Desk nav (`src/app/desk/layout.tsx`): this branch showed Events and hid Waivers, dev showed Waivers and hid Events. Both pages now have content, so both links show (Check-in, POS, Customers, Events, Waivers) and the "hidden until it has content" comment is gone.
  - Moved the EFT "Monthly payments" card (#179) from the Home tab to the Membership tab (`/me/membership`, after the plan card, outside the purchase check so it shows outside demo mode). The Home tab is this branch's version unchanged.
  - `schema.prisma` and `DATABASE.md`: kept both sides (`Climber` has `classBookings` and `bankAccount`; the table list has `BankAccount` and the calendar/class tables; the "rows are never deleted" note keeps this branch's events/classes sentences and dev's `BankAccount` exception).
  - E2E: `accessibility.spec.ts` checks this branch's `/desk/events/*` pages plus dev's `/desk/waivers/edit`; `navigation.spec.ts` expects all four desk links and hides nothing on the desk; `eft.spec.ts` opens `/me/membership` after logging in.
- **Files touched:** `src/app/desk/layout.tsx`, `src/app/me/membership/page.tsx`, `src/features/eft/{actions.ts,README.md}`, `src/features/eft/components/{BankAccountCard,BankAccountPanel,BankAccountDialogs}.tsx` (comments only), `prisma/{schema.prisma,DATABASE.md}`, `e2e/{accessibility,navigation,eft}.spec.ts`.
- **Decisions and why:**
  - Membership tab for the EFT card, the developer's call: it's about paying for the membership and sits with the plan, waiver and account cards; #101 keeps Home for status, events and gym info.
  - `refresh()` in `eft/actions.ts` now revalidates `/me/membership` instead of `/me`, since that's where the card is.
  - Migrations needed no change: dev's `20261105003233_eft_bank_account` sorts after this branch's `20261103*` calendar and class migrations and touches only the new `BankAccount` table.
- **Gotchas:** After pulling, run `npx prisma generate` (and restart `next dev`), or `db.bankAccount` doesn't exist and `/me/membership` errors. Apply the EFT migration locally (`npm run local` or `npx prisma migrate deploy`) before the database tests or e2e.
- **Open follow-ups:** The #180 review follow-ups (demo mode gate, recording the debit agreement, `gymId` in `getMyBankAccount`) are unchanged.
- **Verification:** `npx prisma validate` and `npx prisma format --check` clean; `npx prisma generate` ok; `npm run lint` clean; `npx tsc --noEmit` clean; `npm test` 39 files, 385 passed (2 todo); `npm run build` passed. Not run here: `npm run test:db` and Playwright e2e (need the local database migrated and seeded); CI runs them on push.
