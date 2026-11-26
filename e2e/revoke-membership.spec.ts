import { expect, test, type Page } from "@playwright/test";
import { randomStudentId } from "../src/features/climbers/student-id";

// Revoking a membership (#241, #254): a manager does it from the climber's
// page under Customers, confirms and must give a reason, and that page, the
// POS card and the Check-in panel show it. Desk staff don't get the button.
// Needs the demo logins (DEMO_MODE) and the seeded products.

async function logIn(page: Page, username: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/desk/);
}

test("a manager revokes a membership from the climber's page, with a reason, and the desk shows it", async ({
  page,
}) => {
  await logIn(page, "manager");

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
    await page.getByRole("searchbox", { name: "Search climbers" }).fill(last);
    await page.getByRole("list", { name: "Matching climbers" }).getByText(`Casey ${last}`).click();
  };
  await pick();
  await page.getByRole("button", { name: /^1 month membership/ }).click();
  await page.getByRole("button", { name: "Checkout" }).click();
  const checkout = page.getByRole("dialog", { name: "Checkout" });
  await checkout.getByRole("button", { name: "Cash" }).click();
  // Cash needs the amount received before Tender (#250).
  await checkout.getByRole("button", { name: "Exact" }).click();
  await checkout.getByRole("button", { name: "Tender" }).click();
  await page.getByRole("dialog", { name: "Sale saved" }).getByRole("button", { name: "Back to POS" }).click();

  // Back to POS starts a new sale, so pick them again: no Revoke on the POS any more.
  await pick();
  await expect(page.getByRole("group", { name: "Selected climber" })).toContainText(`Casey ${last}`);
  await expect(page.getByRole("button", { name: "Revoke membership" })).toHaveCount(0);

  // Revoke from their page under Customers: the confirm stays off until there's a reason.
  await page.goto(`/desk/customers/${climberId}`);
  await page.getByRole("button", { name: "Revoke membership" }).click();
  const revoking = page.getByRole("dialog", { name: "Revoke membership" });
  await expect(revoking.getByRole("button", { name: "Revoke membership" })).toBeDisabled();
  await revoking.getByLabel("Reason").fill("Couldn't pay this month");
  await revoking.getByRole("button", { name: "Revoke membership" }).click();
  await expect(revoking).toBeHidden();
  // The page says so straight away, with why, and the button is gone.
  await expect(page.getByText("Couldn't pay this month").first()).toContainText(/^Revoked /);
  await expect(page.getByRole("button", { name: "Revoke membership" })).toHaveCount(0);

  // So does the POS card.
  await page.goto(`/desk/pos?climber=${climberId}`);
  await expect(page.getByText("Couldn't pay this month").first()).toContainText(/^Revoked /);

  // The Check-in panel says it was revoked, and why.
  await page.goto(`/desk?climber=${climberId}`);
  const panel = page.getByRole("complementary");
  await expect(panel.getByText(/^Revoked /)).toBeVisible();
  await expect(panel.getByText("Couldn't pay this month")).toBeVisible();
});

test("desk staff don't get Revoke membership", async ({ page }) => {
  await logIn(page, "desk");
  // A seeded climber with an active membership, opened from the POS.
  await page.getByRole("link", { name: "POS", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search climbers" }).fill("demo valid active");
  await page.getByRole("list", { name: "Matching climbers" }).getByText("Demo Valid-Active").click();
  await page.getByRole("link", { name: /Open account/ }).click();
  await expect(page).toHaveURL(/\/desk\/customers\/[0-9a-f-]+$/);
  await expect(page.getByText("Active", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Revoke membership" })).toHaveCount(0);
});
