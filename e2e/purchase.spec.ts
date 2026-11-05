import { expect, test, type Page } from "@playwright/test";
import { openTab } from "./climber";

// Buying on the climber's Membership tab (elevate-docs#58, #101): a Membership
// section for climbers without one, rentals and chalk for everyone, and a
// Purchase history dialog. Needs the demo login (DEMO_MODE) and seeded products
// (`npm run db:seed`, which also resets the demo climbers).

async function logIn(page: Page, username: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/me/);
}

async function openPurchase(page: Page, username: string) {
  await logIn(page, username);
  await openTab(page, "Membership");
  await expect(page.getByRole("heading", { name: "Membership", level: 1 })).toBeVisible();
}

test("a climber with no waiver buys a membership from the Membership section", async ({ page }) => {
  await openPurchase(page, "demo-missing-none");

  // The waiver is a nudge, never a block.
  await expect(page.getByTestId("waiver-card")).toContainText("No waiver on file");

  // No membership: the Membership section is there and open, with no notice.
  const membership = page.getByRole("button", { name: "Membership", exact: true });
  await expect(membership).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(/already have an active membership/)).toHaveCount(0);

  await page.getByRole("button", { name: /^1 month/ }).click();
  await page.getByRole("button", { name: "Checkout", exact: true }).click();
  const checkout = page.getByRole("dialog", { name: "Checkout" });
  await expect(checkout).toContainText("GST (5%)");
  await expect(checkout).toContainText("demo checkout");
  // Desk-only controls never show to a climber.
  await expect(checkout.getByRole("button", { name: "Tender" })).toHaveCount(0);
  await expect(checkout.getByRole("button", { name: "Cash" })).toHaveCount(0);
  await checkout.getByRole("button", { name: /^Pay \$/ }).click();

  const done = page.getByRole("dialog", { name: "You're all set" });
  await expect(done).toContainText("Your order");
  await expect(done.getByRole("button", { name: "Check in now" })).toHaveCount(0);
  await done.getByRole("button", { name: "Done" }).click();
  await expect(done).toBeHidden();

  // The plan updates without a reload, and the Membership section goes away.
  await expect(page.getByTestId("plan-card")).toContainText("Active");
  await expect(page.getByRole("button", { name: "Membership", exact: true })).toHaveCount(0);
  await expect(
    page.getByText("You already have an active membership, so you don't need a day pass."),
  ).toBeVisible();
  // Rentals and chalk are still there.
  await expect(page.getByRole("button", { name: "One more Shoe rental" })).toBeEnabled();
});

test("anyone can buy rentals, with a quantity, and see them in Purchase history", async ({ page }) => {
  await openPurchase(page, "demo-valid-active");
  // An active member has no Membership section, only the notice and the rentals.
  await expect(page.getByRole("button", { name: "Membership", exact: true })).toHaveCount(0);
  await expect(
    page.getByText("You already have an active membership, so you don't need a day pass."),
  ).toBeVisible();

  await page.getByRole("button", { name: "One more Shoe rental" }).click();
  await page.getByRole("button", { name: "One more Shoe rental" }).click();
  await page.getByRole("button", { name: "Checkout", exact: true }).click();
  const checkout = page.getByRole("dialog", { name: "Checkout" });
  // 2 × 6.00 = 12.00, plus 5% GST and 7% PST on rentals.
  await expect(checkout).toContainText("PST (7%)");
  await expect(checkout).toContainText("$13.44");
  await expect(checkout).toContainText("pick it up at the front desk");
  await checkout.getByRole("button", { name: /^Pay \$13.44/ }).click();
  const done = page.getByRole("dialog", { name: "You're all set" });
  await expect(done).toContainText("Shoe rental ×2");
  await done.getByRole("button", { name: "Done" }).click();
  await expect(done).toBeHidden();

  await page.getByRole("button", { name: "Purchase history" }).click();
  const history = page.getByRole("dialog", { name: "Purchase history" });
  const latest = history.getByRole("list", { name: "Your purchases" }).getByRole("listitem").first();
  await expect(latest).toContainText("Shoe rental ×2");
  await expect(latest).toContainText("Online");
  await expect(latest).toContainText("$13.44");
  await history.getByRole("button", { name: "Done" }).click();
  await expect(history).toBeHidden();
});

test("a climber buys shoes, a harness and chalk in one checkout (#143)", async ({ page }) => {
  await openPurchase(page, "demo-valid-active");
  const more = (name: string) => page.getByRole("button", { name: `One more ${name}` });
  await more("Shoe rental").click();
  await more("Shoe rental").click();
  await more("Harness rental").click();
  for (let i = 0; i < 3; i++) await more("Chalk").click();

  // 2 × 6.00 + 5.00 + 3 × 8.00 = 41.00 before tax, in one order.
  const order = page.getByRole("list", { name: "Your order" });
  await expect(order).toContainText("Shoe rental ×2");
  await expect(order).toContainText("Harness rental");
  await expect(order).toContainText("Chalk ×3");
  await page.getByRole("button", { name: "Checkout", exact: true }).click();
  const checkout = page.getByRole("dialog", { name: "Checkout" });
  // GST 2.05, PST 7% of 41.00 is 2.87.
  await expect(checkout).toContainText("$41.00");
  await expect(checkout).toContainText("$2.05");
  await expect(checkout).toContainText("$2.87");
  await checkout.getByRole("button", { name: "Pay $45.92" }).click();
  const done = page.getByRole("dialog", { name: "You're all set" });
  await expect(done).toContainText("Shoe rental ×2");
  await expect(done).toContainText("Chalk ×3");
  await done.getByRole("button", { name: "Done" }).click();
  await expect(done).toBeHidden();

  // The order is empty again, and it is one purchase in the history.
  await expect(page.getByRole("button", { name: "Checkout", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Purchase history" }).click();
  const history = page.getByRole("dialog", { name: "Purchase history" });
  const latest = history.getByRole("list", { name: "Your purchases" }).getByRole("listitem").first();
  await expect(latest).toContainText("Shoe rental ×2");
  await expect(latest).toContainText("Chalk ×3");
  await expect(latest).toContainText("$45.92");
});

test("an order holds one membership or pass: picking another replaces it (#143)", async ({ page }) => {
  await openPurchase(page, "demo-valid-none");
  await page.getByRole("button", { name: /^1 month/ }).click();
  await page.getByRole("button", { name: "One more Shoe rental" }).click();
  const order = page.getByRole("list", { name: "Your order" });
  await expect(order).toContainText("1 month membership");
  await expect(order).toContainText("Shoe rental");

  // A day pass takes the membership's place; the shoes stay.
  await page.getByRole("button", { name: /^Day pass/ }).click();
  await expect(order).toContainText("Day pass");
  await expect(order).not.toContainText("1 month membership");
  await expect(order).toContainText("Shoe rental");
  await expect(page.getByRole("button", { name: /^(✓ )?1 month membership/ })).toHaveAttribute("aria-pressed", "false");

  // Picking the day pass again takes it out.
  await page.getByRole("button", { name: /Day pass/ }).click();
  await expect(order).not.toContainText("Day pass");
});

test("Home's Before you climb card offers Buy a membership, which opens the Membership tab", async ({ page }) => {
  await logIn(page, "demo-valid-none");
  const ready = page.getByTestId("ready-to-climb");
  await expect(ready).toContainText("No membership");
  await ready.getByRole("link", { name: "Buy a membership" }).click();
  await expect(page).toHaveURL(/\/me\/membership/);
  await expect(page.getByRole("button", { name: "Membership", exact: true })).toHaveAttribute("aria-expanded", "true");
});

test("the old Purchase tab address opens the Membership tab", async ({ page }) => {
  await logIn(page, "demo-valid-active");
  await page.goto("/me/purchase");
  await expect(page).toHaveURL(/\/me\/membership/);
});

test("the Check in tab centres the code, the member code and the scan button for every state", async ({ page }) => {
  for (const user of ["demo-valid-none", "demo-valid-active", "demo-missing-expired", "demo-expired-paused"]) {
    await page.context().clearCookies();
    await logIn(page, user);
    await openTab(page, "Check in");
    const code = (await page.getByRole("img", { name: /Demo check-in code/ }).boundingBox())!;
    const member = (await page.getByText(/^ELV-/).boundingBox())!;
    const scan = (await page.getByRole("button", { name: "Simulate scan" }).boundingBox())!;
    const middle = (box: { x: number; width: number }) => box.x + box.width / 2;
    expect(Math.abs(middle(code) - middle(member)), `${user}: member code vs QR code`).toBeLessThan(2);
    expect(Math.abs(middle(code) - middle(scan)), `${user}: scan button vs QR code`).toBeLessThan(2);
  }
});

test("a climber who is set to climb gets no Before you climb card", async ({ page }) => {
  await logIn(page, "demo-valid-active");
  await expect(page.getByRole("heading", { name: /^Hi, / })).toBeVisible();
  await expect(page.getByTestId("ready-to-climb")).toHaveCount(0);
});
