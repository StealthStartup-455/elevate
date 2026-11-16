import { expect, test } from "@playwright/test";
import { signWaiverForm } from "./sign-waiver";

// Staff add a climber at the desk and land on that climber's page with the
// waiver step, the same next step /join gives a climber (#88).
test("the desk adds a climber and lands on their page with the waiver step", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("desk");
  await page.getByLabel("Password").fill("desk");
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/desk/);

  const unique = Date.now().toString().slice(-6);
  await page.goto("/desk/customers/new");
  // /desk/customers/new briefly renders the form twice while it loads (seen
  // on dev too); wait for one before typing.
  await expect(page.locator('input[name="dateOfBirth"]')).toHaveCount(1);
  await page.getByRole("textbox", { name: "First name" }).fill("Casey");
  await page.getByRole("textbox", { name: "Last name" }).fill(`Desk${unique}`);
  await page.getByRole("textbox", { name: "Phone number" }).fill(`250556${unique.slice(-4)}`);
  await page.getByLabel("Date of birth").fill("1992-04-04");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/desk\/customers\/[0-9a-f-]+\?added=1/);
  await expect(page.getByText("Climber added.")).toBeVisible();
  await expect(page.getByRole("heading", { name: `Casey Desk${unique}` })).toBeVisible();
  await expect(page.getByRole("link", { name: "Later" })).toBeVisible();

  // Signing opens the real waiver form, then the climber's page shows it as valid.
  await page.getByRole("link", { name: /sign a waiver/i }).click();
  await expect(page).toHaveURL(/\/desk\/customers\/[0-9a-f-]+\/waiver$/);
  await signWaiverForm(page);
  await expect(page.getByText("Waiver signed", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Back to Casey/ }).click();
  await expect(page.getByText("Valid", { exact: true })).toBeVisible({ timeout: 5_000 });
});
