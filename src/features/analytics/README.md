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
- **Swap point.** `queries.ts` is the only place that reads data. To go live, replace the bodies of `getActiveCheckIns` and `getWeeklyBusyness` with real queries and make `busynessNow()` return `new Date()`. Then delete `mock-data.ts` and `mock/`.
- **Config** is in `config.ts`: the window, poll interval, and per-gym level thresholds (placeholder defaults: low < 20, medium 20 to 40, high > 40) and time zone.
- **Privacy.** The member view uses `getBusynessSummary`, which returns counts only, so no other climber's name reaches a member's browser.

### Mock data

The mock data is fixed: every timestamp is set relative to one reference time (a Thursday at 6:30 PM), so pages show the same thing on every request and the "now" cell on the heat map stays put.

| Scenario | In the gym | Level |
|---|---|---|
| `quiet` | 8 | Quiet (low) |
| `moderate` (default) | 28 | Moderate (medium) |
| `busy` | 55 | Busy (high) |

- **Switch scenario:** set `MOCK_BUSYNESS_SCENARIO` in `.env`. `next dev` reloads it, so just refresh the page. `none` turns generated check-ins off, leaving only real ones.
- **Labelled on screen (#64):** whenever generated check-ins are in the count, the desk and climber cards say how many ("Demo data: 28 of these 29 check-ins are samples"), and the heat map says the week is a sample. With `none` and real check-ins only, the count has no label; the heat map keeps its label until it uses real data (#39). Each result carries `sampleCount` (summaries), `sample` (each desk row) and `sample` (the week).
- **Change the numbers:** `npm run mock:busyness -- busy 70` regenerates `mock/busy.json` with 70 climbers in the gym. Add a third number for older check-ins outside the window. Edit `SCENARIOS` in `scripts/generate-busyness-mock.ts` to change the defaults.
- **Regenerate everything:** `npm run mock:busyness`. The output is deterministic, so regenerating with the same settings changes nothing.
- `mock/week.json` holds the typical week for the heat map. When real data from Rock Gym Pro is available, it can replace these files in the same shape.
