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

## On the climber app

The Check in tab (`/me/check-in`, `features/check-ins/components/CheckInCard.tsx`) shows the check-in barcode, the student ID under it and whether the membership and waiver are in order. Home shows `components/ReadyToClimb.tsx` ("Before you climb") only when the waiver or a pass is missing. The plan itself is on the Membership tab (`features/purchase/components/PlanCard.tsx`).

- `getMyMembership()` in `queries.ts` returns one demo member until auth and the memberships table exist.
- `ClimberBarcode` draws the climber's student ID (`V` and 8 digits, #38) as a Code 128 barcode. It replaced the QR code. It is the same in every mode and never changes. The bars come from `code128.ts` (`jsbarcode`); the desk's Check in dialog reads it with the camera (`BarcodeCamera` in features/check-ins, `@zxing/browser`), or finds it by typing a V number, name or phone number. Check-in on the phone still goes through "Simulate scan".
- Every climber has a `studentId`, unique per gym. It is a required field on /join and in the desk's add and edit forms (`student-id.ts` holds the format). Climbers from before it existed got `V9xxxxxxx` placeholders in the migration; staff can correct them on the climber's page.
