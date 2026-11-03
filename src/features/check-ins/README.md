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
