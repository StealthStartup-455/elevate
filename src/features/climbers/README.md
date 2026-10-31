# climbers

Climber lookup and profiles, plus memberships and incident reports. Memberships, punch cards and day passes are sold on the desk POS (`features/pos`); check-in here uses them, taking a punch from a punch card when there's no membership or day pass.

**Owner:** _TBD_

## Folder shape

```
features/climbers/
├── actions.ts     # writes (Server Actions)
├── queries.ts     # reads
├── components/    # UI used only by this feature
└── *.test.ts
```

Pages in `src/app/` import from here. Nothing outside this folder talks to its tables directly.

## Membership card (mock)

`/me` shows `components/MembershipCard.tsx`: plan, status, renewal date, waiver status and a check-in code.

- `getMyMembership()` in `queries.ts` returns one demo member until auth and the memberships table exist.
- `DemoQrCode` is a real, scannable QR code in demo mode (it opens a song, for the class demo, #146) and a placeholder that only looks like one everywhere else. Nothing reads its content: check-in goes through "Simulate scan". Replace it once the check-in ticket picks a code format.
