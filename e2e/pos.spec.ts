import { expect, test, type Page } from "@playwright/test";

// The desk POS (elevate-docs#56): find a climber, fill the cart, check out
// with GST, tender, then void. Needs the demo login (DEMO_MODE) and seeded
// products (`npm run db:seed`).

async function openPos(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("desk");
  await page.getByLabel("Password").fill("desk");
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/desk/);
  await page.getByRole("link", { name: "POS", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Point of sale" })).toBeVisible();
}

async function pickClimber(page: Page, name: string) {
  await page.getByRole("searchbox", { name: "Search name or phone" }).fill(name);
  await page.getByRole("list", { name: "Matching climbers" }).getByText(name).click();
}

test("staff sell a day pass and rentals, tender cash, then void the sale", async ({ page }) => {
  await openPos(page);
  await pickClimber(page, "Nevin Gill");

  await page.getByRole("button", { name: /^Day pass/ }).click();
  await page.getByRole("button", { name: /^Shoe rental/ }).click();
  await page.getByRole("button", { name: "One more Shoe rental" }).click();
  // 25.00 + 2 × 6.00, before tax.
  await expect(page.getByLabel("Subtotal")).toHaveText("$37.00");

  await page.getByRole("button", { name: "Checkout" }).click();
  const checkout = page.getByRole("dialog", { name: "Checkout" });
  await expect(checkout).toContainText("GST (5%)");
  await expect(checkout).toContainText("$1.85");
  await expect(checkout).toContainText("$38.85");
  await checkout.getByRole("button", { name: "Cash" }).click();
  await expect(checkout).toContainText("Take $38.85 in cash");
  await checkout.getByRole("button", { name: "Tender" }).click();

  const done = page.getByRole("dialog", { name: "Sale saved" });
  await expect(done).toContainText("$38.85 paid by cash for Nevin Gill");
  await expect(done).toContainText("Day pass: today");
  await done.getByRole("button", { name: "Check in now" }).click();
  // A rerun on the same database finds them already checked in.
  await expect(done).toContainText(/checked in/i);
  await done.getByRole("button", { name: "New sale" }).click();

  const sales = page.getByRole("table", { name: "Today's sales" });
  const row = sales.getByRole("row").filter({ hasText: "Nevin Gill" }).first();
  await expect(row).toContainText("$38.85");
  await row.getByRole("button", { name: /^Void/ }).click();
  const voiding = page.getByRole("dialog", { name: "Void sale" });
  await voiding.getByLabel("Reason").fill("Test sale");
  await voiding.getByRole("button", { name: "Void sale" }).click();
  await expect(voiding).toBeHidden();
  await expect(sales.getByRole("row").filter({ hasText: "Test sale" }).first()).toContainText("Voided");
});

test("a missing waiver is a warning, not a block", async ({ page }) => {
  await openPos(page);
  await pickClimber(page, "Seth Miller");
  await page.getByRole("button", { name: /^Day pass/ }).click();
  await expect(page.getByText("No waiver on file")).toBeVisible();
  await expect(page.getByRole("button", { name: "Checkout" })).toBeEnabled();
});
