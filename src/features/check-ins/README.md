# check-ins

QR/barcode scan capture, the check-in itself, and the green/red status at the desk.

**Owner:** _TBD_

## Folder shape

```
features/check-ins/
├── actions.ts     # writes (Server Actions)
├── queries.ts     # reads
├── components/    # UI used only by this feature
└── *.test.ts
```

Pages in `src/app/` import from here. Nothing outside this folder talks to its tables directly.

## How a scan reaches the desk (#127)

1. The climber taps Simulate scan on `/me`: `recordScan` saves a `QrScan` row for their gym.
2. Every open desk page polls `waitingDeskScans` every 2.5 s (`DeskArrivals`, in the desk layout's nav, so Check-in, POS, Customers and the rest all get it). It returns every waiting scan **without taking any**, so every desk sees the same arrivals, and a reload shows them again.
3. Each scan the tab hasn't announced yet gets a toast in the top-right corner (#225): initials (no profile photos yet), name, a `StatusPill` (✓ Ready to check in, or ✕ Can't check in yet), the reasons and the next step from `scan-toast.ts`, and **Open check-in**, which opens `/desk?climber=<id>`. It plays a ding (ready) or a buzz (something missing) once per arrival (`scan-sound.ts`, Web Audio, nothing to download). Announced scan ids are kept in `sessionStorage`, so polling and reloads never replay a sound.
4. A toast goes after 10 seconds or with ✕, and pauses while the pointer moves over it or it has keyboard focus. It is not a dialog: it takes no focus, closes nothing and doesn't change the selected climber, so it can show while manual check in, a POS sale or the climber panel is open.
5. Dismissing a toast only hides it. The scan stays in the nav's **Arrivals (N)** list until staff check the climber in (anywhere: `checkInClimber` calls `finishScansForClimber`) or press **Clear** there (`finishDeskScan`). Either sets `takenAt` on that scan and any repeat taps by the same climber, on every desk.
6. A scan nobody deals with expires after `SCAN_TTL_MS` (5 minutes).

The free day pass stopgap (#62) is in Manual check in; the old scan popup that also offered it is gone.

## The desk's day of check-ins (#168)

`getDeskDay({ date, page })` in `queries.ts` reads one gym day of `CheckIn` rows for the Check-in page, newest first, 25 a page. The pure parts are in `day.ts`.

- **The gym's day, not UTC's.** `gymDayBounds` runs midnight to midnight in `Gym.timeZone` (23 or 25 hours when the clocks change). `startOfGymDay` is built on `endOfGymDay`, so daylight saving is handled in one place.
- **URL values are checked.** A date that isn't real, or is after today, shows today; a page that doesn't exist shows page 1.
- **Badge is the pass that let them in at the time** (`badgeAt`). `CheckIn` doesn't record it, and passes change after the visit: a day pass ends at midnight, the visit may have used the last punch. It reuses `summarizeMembership` and `hasDayPass` at the check-in time, and `badgeFor` follows the order `checkInClimber` uses (membership, day pass, punch card).
- **Waiver and Message are as of now** (`getClimberStatuses`), because that's what the desk acts on. "N visits left" is only shown on the climber's latest visit; older counts aren't kept.
- **Message order** (`rowMessage`): a waiver problem, the last punch used, a first visit (their first check-in at this gym), then what let them in.

## Seeded check-ins

`npm run db:seed` saves 27 check-ins earlier today (and return visits last week) for busyness climbers, all over 2 hours old so tests can still check people in.

Daily demo attendance is initialized by `demo-day.ts` in demo mode for the fictional `demo-gym` only. Both day and recent-window reads await initialization before querying. Deterministic daily ids and `skipDuplicates` prevent duplicates across concurrent requests. Starting visits are saved once per local day, never shifted on refresh. `MOCK_BUSYNESS_SCENARIO=none` disables new daily visits.

The daily demo also has exactly one Employee pass, one Day pass and one Expired waiver example, created once per gym day alongside ordinary sample visits. Employee pass is a demo-only badge backed by a membership, not a new authorization role. The expired-waiver row is a display fixture; real check-in actions still require a valid waiver. All saved visits, including these fixtures, age out of the recent count after two hours.
