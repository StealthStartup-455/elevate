# 2026-11-24 23:10 UTC: Cash change, 5 cent cash rounding, rounded cash in the cash out

- **Developer:** @zack122
- **AI tool / model:** Claude Code
- **Issue / PR:** StealthStartup-455/elevate#250 / StealthStartup-455/elevate#253
- **Branch:** `feature/250-cash-change`
- **What the agent did:**
  - Checkout (`CheckoutDialog.tsx`): paying by Cash shows the cash rounding and a **Cash total** rounded to the nearest 5 cents, a **Cash received** box, Exact/+$5/+$20/+$50/+$100 buttons (each bill adds to the cash received, with Clear), and **Change owed**. Tender is disabled (in `DisabledReason`) until the cash covers the rounded total. The saved screen shows the rounded amount and the change. Card is unchanged.
  - New `src/features/pos/cash.ts` (`roundCash`, `cashRounding`, `addBill`, `cashTendered`) with tests.
  - Cash out (`cashout.ts`, `CashOutDialog.tsx`): Cash and Card stay separate rows; the Cash total and the till comparison use each cash sale rounded to 5 cents. `CashOutTotals` has a new `roundingCents`, and the dialog shows the day's cash rounding. Today's sales header totals now come from `cashOutSummary`, so they match.
- **Files touched:** `src/features/pos/{cash.ts,cash.test.ts,cashout.ts,cashout.test.ts,README.md}`, `src/features/pos/components/{CheckoutDialog,CashOutDialog,TodaysSales}.tsx`, `e2e/pos.spec.ts`, `src/components/ui/theme/theme.ts`, `STYLE_GUIDE.md`
- **Decisions and why:**
  - Bill buttons add instead of set, because one $5 or $20 rarely covers a sale; +$20 twice is $40.
  - Card/Cash uses a new `size="large"` toggle group look in `theme.ts` (separate bordered options, ✓ on the picked one). No new tokens; other toggles don't use that size, so they don't change.
  - No database change: a sale keeps its exact `totalCents`; the cash amount is derived with `roundCash` wherever it's shown. The cash received and change are not saved (out of scope in #250).
  - Rounding is per sale (what the customer actually hands over), not on the day's total.
  - Today's sales table rows still show each sale's exact total; only the header totals and the cash out are rounded.
- **Gotchas:** `npm ci` fails on dev because `package-lock.json` is out of sync with `package.json` (used `npm install` and reverted the lock file). `npm run build` sometimes stops once with a Next.js security notice; running it again passes. The e2e $39.69 cash sale is now $39.70.
- **Open follow-ups:** None for #250. The Next.js security notice from the build is for the team to look at separately.
- **Verification:** `npm run lint` clean; `npx tsc --noEmit` clean; `npm test` 50 files, 445 passed (2 todo) before the Today's sales tweak, then `vitest run src/features/pos` 5 files, 62 passed; `npm run build` passed; `npx playwright test e2e/pos.spec.ts` 2 passed against the production build on a freshly migrated and seeded local Postgres (DEMO_MODE). Checkout (cash, empty and with $50) and the cash out were checked in screenshots in light and dark mode. `npm run test:db` and the full e2e suite were not run. Follow-up (bill buttons, Card/Cash look): `npm run lint` and `npx tsc --noEmit` clean; `npm test` 448 passed, 2 todo; `npm run build` passed on the second run (security notice on the first); checkout checked in light and dark in the browser. `e2e/pos.spec.ts` was updated but not run after this follow-up.
