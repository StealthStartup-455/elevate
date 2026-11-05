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

Shown on the front desk (`/desk`) and the member dashboard (`/me`). The desk re-renders every 5 minutes (and straight after each check-in it makes); the member card every minute (#86).

- **Computed, not stored.** A climber counts as in the gym for `ACTIVE_WINDOW_MINUTES` (120) after check-in. There is no checked-out state and no job that flips records.
- **Shared attendance.** The recent count, day table and hourly bars all read saved `CheckIn` rows on the real clock. Only the typical-week heat map still uses a sample (#39).
- **Config** is in `config.ts`: the window, refresh intervals, and per-gym level thresholds (placeholder defaults: low < 20, medium 20 to 40, high > 40) and time zone.
- **Privacy.** The member view uses `getBusynessSummary`, which returns counts only, so no other climber's name reaches a member's browser.

### Mock data

In demo mode, opening the fictional `demo-gym` adds starting visits once per gym-local day. These are saved check-ins for seeded busyness members, so they appear in the table, bars and recent count. Team and demo login accounts are left available for presenting. New check-ins add to the same counts. Refreshes never duplicate or move the starting visits; they age out of the two-hour count normally. Production and other gyms never auto-populate visits.

| Scenario | Starting visits (up to eligible seeded members) | Level |
|---|---|---|
| `quiet` | 8 | Quiet (low) |
| `moderate` (default) | 28 | Moderate (medium) |
| `busy` | 55 | Busy (high) |

- **Switch scenario:** set `MOCK_BUSYNESS_SCENARIO` in `.env`. `next dev` reloads it, so just refresh the page. `none` stops adding daily demo visits; already saved visits remain in history. Production never adds demo visits, even with a scenario set. Changing scenarios takes effect on the next day that has no starting visits.
- **Labelled on screen (#64):** whenever generated check-ins are in the count, the desk and climber cards say how many ("Demo data: 28 of these 29 check-ins are samples"), and the heat map says the week is a sample. When no saved demo visits remain in the recent window, the count has no label; the heat map keeps its label until it uses real data (#39). Each result carries `sampleCount` (summaries), `sample` (each desk row) and `sample` (the week).
- **Change the numbers:** `npm run mock:busyness -- busy 70` regenerates `mock/busy.json` with 70 climbers in the gym. Add a third number for older check-ins outside the window. Edit `SCENARIOS` in `scripts/generate-busyness-mock.ts` to change the defaults.
- **Regenerate everything:** `npm run mock:busyness`. The output is deterministic, so regenerating with the same settings changes nothing.
- `mock/week.json` holds the typical week for the heat map. When real data from Rock Gym Pro is available, it can replace these files in the same shape.
