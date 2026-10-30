# pos

The desk POS tab (`/desk/pos`, elevate-docs#56): staff pick a climber, add passes, memberships, rentals and chalk to a cart, check out with GST and PST, charge the total on the gym's own card machine (or take cash), then press **Tender** to save the sale. Modelled on the register in Rock Gym Pro and Redpoint. It's a mock-up: prices are rough, and no card details ever reach Elevate.

**Owner:** _TBD_

## How a sale works

1. **Climber:** search, or pick from "Checked in today" or "Renewals due". One climber per sale; changing climber clears the cart.
2. **Cart:** passes (day pass, punch card, membership) are one each, and one membership per sale (picking another replaces it). Rentals and chalk go up to 20. The cart shows a subtotal; a missing or expired waiver is a warning, never a block.
3. **Checkout popup:** lines, subtotal, GST at the gym's `gstRateBps` (5%) on everything, PST at `pstRateBps` (7%) on rentals and chalk only (products with `chargesPst`), total, and Card or Cash. Each tax is rounded once.
4. **Tender:** `recordSale` re-reads prices from the database, saves the `Sale` and its `SaleLine`s and creates the passes in one transaction. The popup's key makes a double press or a retry return the first sale.
5. **Void:** any desk staff member, with a reason. The sale stays, marked voided, and its passes end now. The refund itself happens on the card machine or from the till.
6. **Revoke membership:** on the picked climber's card, when their membership is active or paused. Every membership pass that hasn't ended stops now (a renewal bought early too) and stops renewing. The sales stay paid; to refund, void the sale.

## Passes a sale gives (`passes.ts`)

| Product | Pass |
|---|---|
| Day pass | Today, until midnight in the gym's time zone |
| Punch card | Its punches, no end date. Check-in takes one when there's no membership or day pass |
| Membership | Its months, starting now, or when the current (or already renewed) membership ends |
| Monthly recurring | One month, marked `renews`; listed under "Renewals due" from a week before it ends until two weeks after |
| Rentals, chalk | None |

## Folder shape

```
features/pos/
├── actions.ts     # recordSale, voidSale, revokeMembership, findPosClimbers, getPosClimber (Server Actions, staff only)
├── sale.ts        # saveSale: the one place a sale is saved, shared with features/purchase
├── queries.ts     # getPosData, isPosEnabled, getStaffGym
├── cart.ts        # cart rules and totals, shared by the screen and the server
├── passes.ts      # what each product gives the climber
├── day.ts         # start of the gym's day
├── components/    # the POS screen
└── *.test.ts      # actions.db.test.ts needs Postgres (npm run test:db)
```

The tab only shows for gyms whose `system` is `ELEVATE`; a gym on Rock Gym Pro or Redpoint already sells there.

Every query and action uses the signed-in staff member's gym (`getStaffGym`: `getStaffContext()` then the cached `getGymById`, #34), never `getGym()`. `recordSale` saves the staff member's id on the sale (empty for the demo desk login).

The climber search runs on the server (`findPosClimbers`, the same `searchClimbers` as Manual check in, 8 results, #85), so the page never carries every climber. Picking someone loads them fresh (`getPosClimber`), and they load again after Tender, Check in now and Revoke, so the card shows their new passes. "Checked in today" and the renewals list read `CheckIn` and `Pass` directly and carry just the name.

A climber buying their own pass, rental or chalk in the app (`features/purchase`, elevate-docs#58) goes through the same `saveSale`, so the prices, tax and passes are the same as at the desk. `saveSale` takes the gym (and the staff member, if any) from its caller: the signed-in staff member's gym at the desk, the climber's own gym in the app. Those sales are tendered `ONLINE`; the desk's own Tender only accepts `CARD` and `CASH`.
