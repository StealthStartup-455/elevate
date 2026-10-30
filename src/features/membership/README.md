# membership

The climber's **Membership** tab (`/me/membership`, elevate-docs#58): see your plan and waiver, buy a pass or membership, and see what you've bought. It is the climber's side of the desk POS ([`features/pos`](../pos/README.md)), for a climber who has joined and may not have signed the waiver yet.

**Owner:** _TBD_

## What a climber sees

- **Your plan:** the membership in effect (name, end date), one bought early, any day pass or punch card, and the waiver. A missing or expired waiver shows a **Sign waiver** step, but never blocks a purchase.
- **Buy a pass or membership:** the same products and prices as the desk, one at a time. Rentals and chalk are left out: they are handed over at the desk. Picking one opens a checkout popup with the subtotal, GST, total and any warning (renewing early, a day pass they don't need), then **Pay**. Someone with an **active membership** has nothing to buy: the tiles are disabled, and the warning "You already have an active membership, so you don't need a day pass." shows under the heading. `buyOnline` refuses them too, so a hand-made request can't get round the disabled buttons. Expired, paused and no-membership climbers can buy (a paused one is warned their new membership starts when the paused one ends).
- **Your purchases:** the last 10, newest first. A voided one shows **Refunded**.

Nothing desk-only shows here: no climber search, Card/Cash, Tender, Void or Check in now.

## It is a mock

No card details are asked for and nothing is charged; the popup says so. The sale is recorded with tender `ONLINE`, so the desk's Today's sales shows it apart from card and cash. Real payments, with a payment provider and retry-safe confirmation, are #31 and #45.

## How a purchase works

1. `buyOnline` (`actions.ts`) takes the climber from the **session**, never from the request, so nobody can buy for another climber.
2. It checks the product is active and sold online (`catalog.ts`), then calls `saveSale` from `features/pos/sale.ts`, which re-reads the price from the database, adds GST, saves the sale and creates the pass in one transaction.
3. The popup's key makes a double press or a retry save one purchase. A key that belongs to another climber's sale is refused.
4. The page refreshes: the plan, the dashboard card and the desk's views all show the new pass.

The tab only shows for gyms whose `system` is `ELEVATE`, like the desk POS tab.

## Folder shape

```
features/membership/
├── actions.ts     # buyOnline (Server Action, the signed-in climber only)
├── queries.ts     # getMembershipPage, isOnlinePurchaseEnabled
├── catalog.ts     # what is sold online, and the warnings before paying
├── components/    # MyPlan, BuyMembership, PurchaseHistory
└── *.test.ts      # actions.db.test.ts needs Postgres (npm run test:db)
```
