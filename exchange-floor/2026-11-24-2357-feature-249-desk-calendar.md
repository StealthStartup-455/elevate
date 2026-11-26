# 2026-11-24 23:57 UTC: Desk month calendar with who is registered

- **Developer:** @zack122
- **AI tool / model:** Claude Code
- **Issue / PR:** StealthStartup-455/elevate#249 / PR to follow
- **Branch:** `feature/249-desk-calendar`
- **What the agent did:**
  - New **Calendar** tab, first in `/desk/events`: a Monday-first month grid with previous/next month and Today, each day marked with its classes, events, set changes and special or closed days (letter and words, not color alone).
  - The chosen day lists its hours and everything on it in time order, canceled items marked. Classes show the instructor, places taken and the names signed up, each linked to the climber's account. Read only.
  - `desk-calendar.ts` (pure: grouping by day, arrow keys) and `getDeskCalendar`. No database change.
- **Files touched:** `src/features/events/{desk-calendar.ts,desk-calendar.test.ts,queries.ts,actions.db.test.ts,README.md}`, `src/features/events/components/desk/{DeskMonth,DeskMonthView,EventsTabs}.tsx`, `src/app/desk/events/calendar/page.tsx`, `next.config.ts`, `e2e/{calendar,accessibility}.spec.ts`
- **Decisions and why:**
  - `/desk/events` now lands on Calendar (it was Hours), since Calendar is the first tab.
  - The day is in the address (`?day=`), so Back from a climber's account returns to it. Past and future months both work.
  - Cells count only what is still on; canceled items show in the day's list.
  - Day buttons use screen-reader text, not `aria-label`: axe's `label-content-name-mismatch` fails the latter.
- **Gotchas:** Past days show the regular hours as set now, because older regular hours aren't kept (special days are). Time zone data 2026e keeps Vancouver on one offset all year from November 2026, so clock-change tests use Toronto. A local database seeded before the calendar existed has no hours, classes or events. `npm run build` can stop once with a Next.js security notice.
- **Open follow-ups:** Party and group bookings (#199): until they are stored, the calendar can't say a date is free. Manager-only editing (#236, request 4).
- **Verification:** `npm run lint` and `npx tsc --noEmit` clean; `npm test` 452 passed, 2 todo; `vitest run src/features/events/actions.db.test.ts` 21 passed; `npm run build` passed; `e2e/calendar.spec.ts`, `e2e/climber-calendar.spec.ts` and `e2e/accessibility.spec.ts` 18 passed on a throwaway seeded database against the production build. Checked in light, dark and at phone width. The rest of the e2e suite and the other database tests were not run.
