import { expect, test, type Page } from "@playwright/test";
import { signUpDemoCustomer } from "./climber";

// Release candidate fixes for the Milestone 3 demo (#149): a reload after
// joining (#133) and a double-click on Checkout (#134). Needs the demo login
// (DEMO_MODE) and seeded products (`npm run db:seed`).

async function logIn(page: Page, username: string, landsOn: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(landsOn);
}

test("after joining, a reload says who is signed in and links to the dashboard (issue 133)", async ({
  page,
}) => {
  const unique = Date.now().toString().slice(-6);
  await signUpDemoCustomer(page, {
    firstName: "Robin",
    lastName: `Reload${unique}`,
    phone: `250556${unique.slice(-4)}`,
    dateOfBirth: "1991-02-02",
  });
  await expect(page.getByRole("link", { name: "Go to dashboard" })).toBeVisible();

  await page.reload();
  // The registration screen persists after a reload.
  const main = page.getByRole("main");
  await expect(main.getByText(`Welcome, Robin. Sign the waiver to finish getting ready to climb.`)).toBeVisible();
  await main.getByRole("link", { name: "Go to dashboard" }).click();
  await expect(page).toHaveURL(/\/me$/);
});

test("double-clicking Checkout leaves the checkout open (issue 134)", async ({ page }) => {
  await logIn(page, "desk", /\/desk/);
  await page.getByRole("link", { name: "POS", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Point of sale" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search name or phone" }).fill("Nevin Gill");
  await page.getByRole("list", { name: "Matching climbers" }).getByText("Nevin Gill").click();
  await page.getByRole("button", { name: /^Chalk/ }).click();

  await page.getByRole("button", { name: "Checkout" }).dblclick();
  const checkout = page.getByRole("dialog", { name: "Checkout" });
  await expect(checkout).toBeVisible();
  await page.waitForTimeout(500);
  await expect(checkout).toBeVisible();
  await checkout.getByRole("button", { name: "Cancel" }).click();
  await expect(checkout).toBeHidden();
});
