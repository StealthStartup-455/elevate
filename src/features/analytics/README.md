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
