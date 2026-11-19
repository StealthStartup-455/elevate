import { expect, type Page, test } from "@playwright/test";
import { randomStudentId } from "../src/features/climbers/student-id";

// Possible duplicate climbers: Add climber warns before a second record, and
// Manual check in shows a birthday so same-name climbers can be told apart.

async function logInAsDesk(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("desk");
  await page.getByLabel("Password").fill("desk");
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/desk/);
}

async function addClimber(page: Page, last: string, phone: string, born: string) {
  await page.goto("/desk/customers/new");
  // The page briefly renders the form twice while it loads; wait for one.
  await expect(page.locator('input[name="dateOfBirth"]')).toHaveCount(1);
  await page.getByRole("textbox", { name: "First name" }).fill("Casey");
  await page.getByRole("textbox", { name: "Last name" }).fill(last);
  await page.getByRole("textbox", { name: "Phone number" }).fill(phone);
  await page.getByLabel("Student ID").fill(randomStudentId());
  await page.getByLabel("Date of birth").fill(born);
  await page.getByRole("button", { name: "Create account" }).click();
}

test("adding the same person twice warns, and staff can open them or add anyway", async ({
  page,
}) => {
  await logInAsDesk(page);
  const unique = Date.now().toString().slice(-6);
  const last = `Twin${unique}`;
  const phone = `250557${unique.slice(-4)}`;
  // Another number for the second person, unique per run so old runs don't match.
  const otherPhone = `250559${unique.slice(-4)}`;

  await addClimber(page, last, phone, "1992-04-04");
  await expect(page).toHaveURL(/\/desk\/customers\/[0-9a-f-]+\?added=1/);
  const firstUrl = page.url().split("?")[0];

  // Same name and birthday, another phone: a warning, and nothing saved yet.
  await addClimber(page, last, otherPhone, "1992-04-04");
  const warning = page.getByRole("alert").filter({ hasText: "This person may already exist." });
  await expect(warning).toBeVisible();
  await expect(warning.getByText(`Casey ${last}`)).toBeVisible();
  await expect(warning.getByText(/Born Apr 4, 1992/)).toBeVisible();
  await expect(page).toHaveURL(/\/desk\/customers\/new$/);
  // What was typed is kept.
  await expect(page.getByRole("textbox", { name: "Phone number" })).toHaveValue(otherPhone);

  await warning.getByRole("link", { name: "Open", exact: true }).click();
  await expect(page).toHaveURL(firstUrl);

  // A different person with the same name and birthday: staff add them anyway.
  await addClimber(page, last, otherPhone, "1992-04-04");
  await page.getByRole("button", { name: "Add anyway" }).click();
  await expect(page).toHaveURL(/\/desk\/customers\/[0-9a-f-]+\?added=1/);
  expect(page.url().split("?")[0]).not.toBe(firstUrl);

  // Check in now shows both, told apart by phone and birthday.
  await page.goto("/desk");
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Search name, phone or V number").fill(`Casey ${last}`);
  const results = dialog.getByRole("list", { name: "Matching climbers" });
  await expect(results.getByRole("button")).toHaveCount(2);
  await expect(results.getByText(/Born Apr 4, 1992/)).toHaveCount(2);
});

test("/join warns a returning climber without naming anyone", async ({ page }) => {
  const unique = Date.now().toString().slice(-6);
  const last = `Again${unique}`;
  const phone = `250558${unique.slice(-4)}`;

  async function join() {
    await page.goto("/join");
    await page.getByRole("textbox", { name: "First name" }).fill("Jordan");
    await page.getByRole("textbox", { name: "Last name" }).fill(last);
    await page.getByRole("textbox", { name: "Phone number" }).fill(phone);
    await page.getByLabel("Student ID").fill(randomStudentId());
    await page.getByLabel("Date of birth").fill("1994-02-02");
    await page.getByRole("button", { name: "Create account" }).click();
  }

  await join();
  await expect(page.getByText("You're registered.", { exact: false })).toBeVisible();

  await page.context().clearCookies();
  await join();
  await expect(page.getByText(/You may already have an account here/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Open", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Create a new account anyway" }).click();
  await expect(page.getByText("You're registered.", { exact: false })).toBeVisible();
});
