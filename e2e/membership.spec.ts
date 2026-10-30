import { expect, test, type Page } from "@playwright/test";

// The climber's Membership tab (elevate-docs#58): a climber who has joined but
// not signed the waiver buys a membership with the demo checkout. Needs the
// demo login (DEMO_MODE) and seeded products (`npm run db:seed`).

async function openMembership(page: Page, username: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/me/);
  await page.getByRole("link", { name: "Membership", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Membership", level: 1 })).toBeVisible();
}

test("a climber with no waiver buys a membership, with GST, without desk controls", async ({ page }) => {
  await openMembership(page, "demo-missing-none");

  // The waiver is a nudge, never a block.
  await expect(page.getByText(/haven't signed the waiver yet/)).toBeVisible();

  // Passes and memberships only: rentals and chalk are handed over at the desk.
  await expect(page.getByRole("button", { name: /^Shoe rental/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Chalk/ })).toHaveCount(0);

  // Without a membership, the tiles are live and there is no active-member notice.
  await expect(page.getByText(/already have an active membership/)).toHaveCount(0);
  await page.getByRole("button", { name: /^1 month/ }).click();
  const checkout = page.getByRole("dialog", { name: "Checkout" });
  await expect(checkout).toContainText("GST (5%)");
  await expect(checkout).toContainText("demo checkout");
  // Desk-only controls never show to a climber.
  await expect(checkout.getByRole("button", { name: "Tender" })).toHaveCount(0);
  await expect(checkout.getByRole("button", { name: "Cash" })).toHaveCount(0);
  await checkout.getByRole("button", { name: /^Pay \$/ }).click();

  const done = page.getByRole("dialog", { name: "You're all set" });
  await expect(done).toContainText("Added to your account");
  await expect(done.getByRole("button", { name: "Check in now" })).toHaveCount(0);
  await done.getByRole("button", { name: "Done" }).click();
  await expect(done).toBeHidden();

  // The plan and the purchase list update without a reload.
  await expect(page.getByText("Active", { exact: true })).toBeVisible();
  // Now an active member: buying is off, with the reason under the heading.
  await expect(
    page.getByText("You already have an active membership, so you don't need a day pass."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^1 month/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /^Day pass/ })).toBeDisabled();
  const purchases = page.getByRole("list", { name: "Your purchases" });
  await expect(purchases.getByRole("listitem").first()).toContainText("1 month");
  await expect(purchases.getByRole("listitem").first()).toContainText("Online");
});

test("the dashboard's Buy membership button goes to the Membership tab", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo-valid-none");
  await page.getByLabel("Password").fill("demo-valid-none");
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/me/);
  await page.getByRole("link", { name: "Buy membership" }).click();
  await expect(page).toHaveURL(/\/me\/membership/);
});

test("a climber who already has a membership can't buy another", async ({ page }) => {
  await openMembership(page, "demo-valid-active");
  const buy = page.getByRole("region", { name: "Memberships" });
  await expect(
    page.getByText("You already have an active membership, so you don't need a day pass."),
  ).toBeVisible();
  for (const tile of await buy.getByRole("button").all()) await expect(tile).toBeDisabled();
});
