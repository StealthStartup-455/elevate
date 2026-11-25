import { expect, test } from "@playwright/test";
import { randomStudentId } from "../src/features/climbers/student-id";

// Revoking a membership on the POS (#241): staff confirm and must give a
// reason, and the POS card, their page under Customers and the Check-in panel
// show it. Needs the demo login (DEMO_MODE) and the seeded products.

test("revoking a membership needs a reason, and the desk shows it", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("desk");
  await page.getByLabel("Password").fill("desk");
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/desk/);

  // A new climber each run, so earlier runs' revokes don't show.
  const unique = Date.now().toString().slice(-6);
  const last = `Revoke${unique}`;
  await page.goto("/desk/customers/new");
  // The page briefly renders the form twice while it loads; wait for one.
  await expect(page.locator('input[name="dateOfBirth"]')).toHaveCount(1);
  await page.getByRole("textbox", { name: "First name" }).fill("Casey");
  await page.getByRole("textbox", { name: "Last name" }).fill(last);
  await page.getByRole("textbox", { name: "Phone number" }).fill(`250558${unique.slice(-4)}`);
  await page.getByLabel("Student ID").fill(randomStudentId());
  await page.getByLabel("Date of birth").fill("1994-02-02");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/desk\/customers\/[0-9a-f-]+\?added=1/);
  const climberId = new URL(page.url()).pathname.split("/").pop();

  // Sell them a membership.
  await page.getByRole("link", { name: "POS", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Point of sale" })).toBeVisible();
  const pick = async () => {
    await page.getByRole("searchbox", { name: "Search name or phone" }).fill(last);
    await page.getByRole("list", { name: "Matching climbers" }).getByText(`Casey ${last}`).click();
  };
  await pick();
  await page.getByRole("button", { name: /^1 month membership/ }).click();
  await page.getByRole("button", { name: "Checkout" }).click();
  const checkout = page.getByRole("dialog", { name: "Checkout" });
  await checkout.getByRole("button", { name: "Cash" }).click();
  await checkout.getByRole("button", { name: "Tender" }).click();
  await page.getByRole("dialog", { name: "Sale saved" }).getByRole("button", { name: "Back to POS" }).click();

  // Back to POS starts a new sale, so pick them again. Revoke: the confirm
  // stays off until there's a reason.
  await pick();
  await page.getByRole("button", { name: "Revoke membership" }).click();
  const revoking = page.getByRole("dialog", { name: "Revoke membership" });
  await expect(revoking.getByRole("button", { name: "Revoke membership" })).toBeDisabled();
  await revoking.getByLabel("Reason").fill("Couldn't pay this month");
  await revoking.getByRole("button", { name: "Revoke membership" }).click();
  await expect(revoking).toBeHidden();
  // The POS card says so straight away, with why.
  await expect(page.getByText("Couldn't pay this month").first()).toContainText(/^Revoked /);

  // So does their page under Customers.
  await page.goto(`/desk/customers/${climberId}`);
  await expect(page.getByText("Couldn't pay this month").first()).toContainText(/^Revoked /);

  // The Check-in panel says it was revoked, and why.
  await page.goto(`/desk?climber=${climberId}`);
  const panel = page.getByRole("complementary");
  await expect(panel.getByText(/^Revoked /)).toBeVisible();
  await expect(panel.getByText("Couldn't pay this month")).toBeVisible();
});
