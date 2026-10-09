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
