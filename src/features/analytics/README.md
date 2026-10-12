# analytics

How busy the gym is (heat map from recent check-ins) and session stats.

**Owner:** _TBD_

## Folder shape

```
features/analytics/
├── actions.ts     # writes (Server Actions)
├── queries.ts     # reads
├── components/    # UI used only by this feature
└── *.test.ts
```

Pages in `src/app/` import from here. Nothing outside this folder talks to its tables directly.

## Busyness tracker

Shown on the front desk (`/desk`) and the member dashboard (`/me`). Both views poll every 30 s.

- **Computed, not stored.** A climber counts as in the gym for `ACTIVE_WINDOW_MINUTES` (120) after check-in. There is no checked-out state and no job that flips records.
- **Mock data for now.** `getActiveCheckIns(gymId)` in `queries.ts` is the only function that reads check-ins. Replace its body with the real query and nothing else changes. `mock-data.ts` can then be deleted.
- **Config** is in `config.ts`: the window, poll interval, and per-gym level thresholds (placeholder defaults: low < 20, medium 20 to 40, high > 40) and time zone.
- **Privacy.** The member view uses `getBusynessSummary`, which returns counts only, so no other climber's name reaches a member's browser.
