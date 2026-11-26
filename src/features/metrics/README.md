# metrics

Whether Elevate delivers its value propositions (#251), on `/desk/metrics` for managers and owners. The main one is a **fast, seamless front desk**; reliable waivers, member self service and an easy switch are tracked lighter.

**Owner:** _TBD_

## Where the numbers come from

| Metric | From |
|---|---|
| Time to check in, camera vs search, blocked, sorting out, sent away | `CheckInAttempt`, saved on every outcome of the desk's Check in dialog |
| Arrival wait, lost scans | `QrScan` (`scannedAt` to `takenAt`; lost = no `takenAt` after `SCAN_TTL_MS`) |
| Check ins | `CheckIn` |
| Waivers signed before arriving | A climber's first `CheckIn` vs their first `Waiver.signedAt` |
| Signed up themselves | New `Climber` rows with their own login (`authUserId`) |
| Bought online | Paid `Sale` rows with tender `ONLINE` |
| Days to the first check in, voided sales | `Gym.createdAt`, first `CheckIn`, voided `Sale` rows |

The staff rating after a shift and server errors aren't in the app yet; the page says so.

## Files

```
features/metrics/
├── timing.ts      # what the Check in dialog sends; parseCheckInTiming checks it on the server
├── record.ts      # saves a CheckInAttempt; never throws
├── actions.ts     # recordCheckInGaveUp, for a dialog closed without a check in
├── compute.ts     # rows to numbers (pure, tested)
├── queries.ts     # fetches the last 14 days for the signed-in manager's gym
├── format.ts      # "3.2 s", "40%", reason codes in words
└── components/MetricsDashboard.tsx
```

## Rules

- **Managers and owners only.** `getValuePropMetrics` checks the role next to the data; desk staff see a message instead. The demo `manager` login has the manager role.
- **Ids and reason codes only.** Never names, phones or V numbers.
- **Timing comes from the browser,** so the server clamps it (`MAX_ELAPSED_MS`, 10 minutes) and drops unknown sources and codes.
- **Demo data is marked.** In demo mode the page says the numbers come from testing.
- **A metric never breaks a check in.** `recordCheckInAttempt` logs a failure and carries on.
