# waivers

Daily waiver CSV import, matching waivers to climbers, and duplicate checks. Wrong matches are a legal risk, so test this well.

**Owner:** _TBD_

## Folder shape

```
features/waivers/
├── actions.ts     # writes (Server Actions)
├── queries.ts     # reads
├── components/    # UI used only by this feature
└── *.test.ts
```

Pages in `src/app/` import from here. Nothing outside this folder talks to its tables directly.
