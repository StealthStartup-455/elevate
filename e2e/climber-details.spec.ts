import { expect, test, type Page } from "@playwright/test";

// The desk's climber page shows details read-only, with an Edit button that
// opens the form; the climber table has an Edit link per row (#89).

async function logInAsDesk(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("desk");
  await page.getByLabel("Password").fill("desk");
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/desk/);
}

async function addClimber(page: Page, lastName: string) {
  await page.goto("/desk/climbers/new");
  // /desk/climbers/new briefly renders the form twice while it loads (seen
  // on dev too); wait for one before typing.
  await expect(page.locator('input[name="dateOfBirth"]')).toHaveCount(1);
  await page.getByRole("textbox", { name: "First name" }).fill("Robin");
  await page.getByRole("textbox", { name: "Last name" }).fill(lastName);
  await page.getByRole("textbox", { name: "Phone number" }).fill(`250557${lastName.slice(-4)}`);
  await page.getByLabel("Date of birth").fill("1990-05-05");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/desk\/climbers\/[0-9a-f-]+/);
}

test("staff view a climber, then edit and save from the page", async ({ page }) => {
  await logInAsDesk(page);
  const last = `View${Date.now().toString().slice(-6)}`;
  await addClimber(page, last);

  // Read-only: the details are text, not fields.
  await expect(page.getByText("May 5, 1990")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "First name" })).toHaveCount(0);

  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("textbox", { name: "First name" }).fill("Robyn");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(page.getByRole("heading", { name: `Robyn ${last}` })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "First name" })).toHaveCount(0);
});

test("the climber table's Edit link opens the form", async ({ page }) => {
  await logInAsDesk(page);
  const last = `Table${Date.now().toString().slice(-6)}`;
  await addClimber(page, last);

  await page.goto("/desk/climbers");
  await page.getByRole("link", { name: `Edit Robin ${last}` }).click();
  await expect(page).toHaveURL(/\?edit=1/);
  await expect(page.getByRole("textbox", { name: "First name" })).toHaveValue("Robin");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
});
