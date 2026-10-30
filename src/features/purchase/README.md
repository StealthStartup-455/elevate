# purchase

The climber's **Purchase** tab (`/me/purchase`, elevate-docs#58): see your plan and waiver, buy a membership, rentals or chalk, and see what you've bought. It is the climber's side of the desk POS ([`features/pos`](../pos/README.md)), for a climber who has joined and may not have signed the waiver yet.

**Owner:** _TBD_

## What a climber sees

- **Purchase history** (button, top right): a dialog laid out like the desk's "Manual check in", listing the last 50 purchases, newest first. A voided one shows **Refunded**.
- **Your plan:** the membership in effect (name, end date), one bought early, any day pass or punch card, and the waiver. A missing or expired waiver shows a **Sign waiver** step, but never blocks a purchase.
- **Membership** (expandable, open by default): memberships, the day pass and the punch card. It only exists for a climber **without an active membership** (none, expired or paused). An active member instead sees "You already have an active membership, so you don't need a day pass." and no Membership section.
- **Rentals and chalk:** shoe rental, harness rental and chalk, for everyone, member or not. Quantity 1 to 20; pay here and pick it up at the front desk.

Picking anything opens a checkout popup with the subtotal, GST, total and any warning (a paused membership's new one starts when it ends, a day pass already bought today), then **Pay**.

The dashboard (`/me`) shows **Purchase Membership** under the "Buy a membership to start climbing" text for a climber with no membership; it opens this tab. The QR column beside it stays centred whatever the waiver or membership status.

Nothing desk-only shows here: no climber search, Card/Cash, Tender, Void or Check in now.

## It is a mock

No card details are asked for and nothing is charged; the popup says so. The sale is recorded with tender `ONLINE`, so the desk's Today's sales shows it apart from card and cash. Real payments, with a payment provider and retry-safe confirmation, are #31 and #45.

## How a purchase works

1. `buyOnline` (`actions.ts`) takes the climber from the **session**, never from the request, so nobody can buy for another climber.
2. `canBuyOnline` (`catalog.ts`): an active member can't buy a pass or membership (the section is hidden, and the server refuses a hand-made request); rentals and chalk are open to everyone.
3. It calls `saveSale` from `features/pos/sale.ts`, which re-reads the price from the database, adds GST, checks the quantity (one for a pass, 1 to 20 otherwise), saves the sale and creates the pass, if any, in one transaction.
4. The popup's key makes a double press or a retry save one purchase; changing the quantity makes a new key. A key that belongs to another climber's sale is refused.
5. The page refreshes: the plan, the dashboard card, the history and the desk's views all show the new purchase.

The tab only shows for gyms whose `system` is `ELEVATE`, like the desk POS tab.

## Folder shape

```
features/purchase/
├── actions.ts     # buyOnline (Server Action, the signed-in climber only)
├── queries.ts     # getPurchasePage, isOnlinePurchaseEnabled
├── catalog.ts     # who can buy what, and the warnings before paying
├── components/    # MyPlan, PurchaseOptions, PurchaseHistory
└── *.test.ts      # actions.db.test.ts needs Postgres (npm run test:db)
```
