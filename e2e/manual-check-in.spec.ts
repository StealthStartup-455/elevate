import { expect, test, type Page } from "@playwright/test";

// Manual check in searches on the server as staff type, so the desk page no
// longer carries every climber (#85). Needs the demo login and seeded data.

async function logIn(page: Page, username: string, landsOn: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(landsOn);
}

test("the desk page doesn't contain climbers who aren't checked in", async ({ page }) => {
  await logIn(page, "desk", /\/desk/);
  await expect(page.getByRole("button", { name: "Check in", exact: true })).toBeVisible();
  // A seeded demo climber nobody checks in during the tests.
  expect(await page.content()).not.toContain("Demo Missing-Expired");
});

test("manual check in finds a climber from a typo, searching on the server", async ({ page }) => {
  await logIn(page, "desk", /\/desk/);
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Search name, phone or V number").fill("demo misng expird");
  const results = dialog.getByRole("list", { name: "Matching climbers" });
  await expect(results.getByText("Demo Missing-Expired")).toBeVisible();
  await results.getByText("Demo Missing-Expired").click();
  await expect(dialog).toContainText("needs a valid waiver");
});

test("Check in finds a climber by V number, even with a wrong digit (#38)", async ({ page }) => {
  await logIn(page, "desk", /\/desk/);
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check in" });
  const results = dialog.getByRole("list", { name: "Matching climbers" });

  // Agam Kamran keeps V00946178 in the seed. The last digit is wrong here.
  await dialog.getByLabel("Search name, phone or V number").fill("v00946179");
  await expect(results.getByText("Agam Kamran")).toBeVisible();
  await expect(results.getByText(/V00946178/)).toBeVisible();

  await dialog.getByLabel("Search name, phone or V number").fill("0094617");
  await results.getByText("Agam Kamran").click();
  await expect(dialog.getByRole("heading", { name: "Agam Kamran" })).toBeVisible();
  await expect(dialog).toContainText("V00946178");
});

test("a picked climber in Check in has a POS button that opens them in POS (#237)", async ({ page }) => {
  await logIn(page, "desk", /\/desk/);
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check in" });
  await dialog.getByLabel("Search name, phone or V number").fill("agam kamran");
  await dialog.getByRole("list", { name: "Matching climbers" }).getByText("Agam Kamran").click();
  await dialog.getByRole("link", { name: "POS" }).click();
  await expect(page).toHaveURL(/\/desk\/pos\?climber=[0-9a-f-]+/);

  // Back on the Check-in tab the dialog is closed, not still open on that climber.
  await page.getByRole("link", { name: "Check-in", exact: true }).click();
  await expect(page).toHaveURL(/\/desk$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a climber with no V number is found by name, and has no barcode (#245)", async ({ page }) => {
  await logIn(page, "desk", /\/desk/);
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check in" });
  await dialog.getByLabel("Search name, phone or V number").fill("riley outsider");
  await dialog.getByRole("list", { name: "Matching climbers" }).getByText("Riley Outsider").click();
  await expect(dialog.getByRole("heading", { name: "Riley Outsider" })).toBeVisible();
  await expect(dialog).not.toContainText(/V\d{8}/);
});

test("a sign-up with no V number is saved, and a malformed one is refused (#245)", async ({ page }) => {
  await logIn(page, "desk", /\/desk/);
  await page.goto("/desk/customers/new");
  await expect(page.locator('input[name="dateOfBirth"]')).toHaveCount(1);
  const unique = Date.now().toString().slice(-6);
  await page.getByRole("textbox", { name: "First name" }).fill("Pat");
  await page.getByRole("textbox", { name: "Last name" }).fill(`Visitor${unique}`);
  await page.getByRole("textbox", { name: "Phone number" }).fill(`250556${unique.slice(-4)}`);
  await page.getByLabel("Date of birth").fill("1990-01-01");
  await page.getByLabel("Student ID").fill("12345");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use a V followed by 8 digits, like V00123456.")).toBeVisible();
  await page.getByLabel("Student ID").fill("");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/desk\/customers\/[0-9a-f-]+\?added=1/);
  await expect(page.getByText("None", { exact: true }).first()).toBeVisible();
});
