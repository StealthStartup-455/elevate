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

The Check in tab (`/me/check-in`, `features/check-ins/components/CheckInCard.tsx`) shows the check-in code, the member code and whether the membership and waiver are in order. Home shows `components/ReadyToClimb.tsx` ("Before you climb") only when the waiver or a pass is missing. The plan itself is on the Membership tab (`features/purchase/components/PlanCard.tsx`).

- `getMyMembership()` in `queries.ts` returns one demo member until auth and the memberships table exist.
- `DemoQrCode` is a real, scannable QR code in demo mode (it holds the member code, `ELV-…`, #151) and a placeholder that only looks like one everywhere else. Nothing reads its content: check-in goes through "Simulate scan". Replace it once the check-in ticket picks a code format.

## Possible duplicate climbers (#129)

Before Add climber (`createClimberAtDesk`) or `/join` (`joinAsCustomer`) saves, `findPossibleDuplicates` in `queries.ts` looks for someone who may already be them. A match returns `status: "duplicate"` without saving, and `ClimberForm` shows a warning and turns the submit button into "Add anyway" (desk) or "Create a new account anyway" (`/join`), which sends `confirmDuplicate` back.

- **Desk:** the same phone, or the same name and birthday (names ignore case). Staff see who matched, with phone and birthday, and can open them. A family sharing one phone matches too, which is why staff can still add.
- **`/join`:** the same name and either the phone or the birthday, and the warning names nobody. It's public, so a phone number alone must not reveal that its owner climbs here.
- The desk's confirm value is the matched ids, so a form changed to match someone else warns again.
- Manual check in shows each climber's birthday beside their phone, so same-name climbers can be told apart. The Customers list already has a Born column.
