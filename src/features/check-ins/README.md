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
2. Every open desk page polls `nextDeskScan` every 2.5 s (`ScanWatcher`, in the desk layout, so Check-in, POS and Climbers all get it). It returns the oldest waiting scan **without taking it**, so every desk shows the same arrival, and a reload shows it again.
3. Staff deal with it: **Check in** (when it succeeds) or **Close** calls `finishDeskScan`, which sets `takenAt` on that scan and on any repeat taps by the same climber. Other desks see it's gone (`isDeskScanWaiting`) and close their popup.
4. A scan nobody deals with expires after `SCAN_TTL_MS` (5 minutes).

The popup waits while another desk dialog is open (manual check in, POS checkout, void, revoke: `useDeskDialogOpen`, #92). A click outside the popup doesn't dismiss it; Close and Escape do.

## The desk's day of check-ins (#168)

`getDeskDay({ date, page })` in `queries.ts` reads one gym day of `CheckIn` rows for the Check-in page, newest first, 25 a page. The pure parts are in `day.ts`.

- **The gym's day, not UTC's.** `gymDayBounds` runs midnight to midnight in `Gym.timeZone` (23 or 25 hours when the clocks change). `startOfGymDay` is built on `endOfGymDay`, so daylight saving is handled in one place.
- **URL values are checked.** A date that isn't real, or is after today, shows today; a page that doesn't exist shows page 1.
- **Badge is the pass that let them in at the time** (`badgeAt`). `CheckIn` doesn't record it, and passes change after the visit: a day pass ends at midnight, the visit may have used the last punch. It reuses `summarizeMembership` and `hasDayPass` at the check-in time, and `badgeFor` follows the order `checkInClimber` uses (membership, day pass, punch card).
- **Waiver and Message are as of now** (`getClimberStatuses`), because that's what the desk acts on. "N visits left" is only shown on the climber's latest visit; older counts aren't kept.
- **Message order** (`rowMessage`): a waiver problem, the last punch used, a first visit (their first check-in at this gym), then what let them in.

## Seeded check-ins

`npm run db:seed` saves 27 check-ins earlier today (and return visits last week) for busyness climbers, all over 2 hours old so tests can still check people in.
