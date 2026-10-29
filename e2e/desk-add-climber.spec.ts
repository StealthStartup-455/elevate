import { expect, test } from "@playwright/test";

// Staff add a climber at the desk and land on that climber's page with the
// waiver step, the same next step /join gives a climber (#88).
test("the desk adds a climber and lands on their page with the waiver step", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("desk");
  await page.getByLabel("Password").fill("desk");
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/desk/);

  const unique = Date.now().toString().slice(-6);
  await page.goto("/desk/climbers/new");
  await page.getByRole("textbox", { name: "First name" }).fill("Casey");
  await page.getByRole("textbox", { name: "Last name" }).fill(`Desk${unique}`);
  await page.getByRole("textbox", { name: "Phone number" }).fill(`250556${unique.slice(-4)}`);
  await page.getByLabel("Date of birth").fill("1992-04-04");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/desk\/climbers\/[0-9a-f-]+\?added=1/);
  await expect(page.getByText("Climber added.")).toBeVisible();
  await expect(page.getByRole("heading", { name: `Casey Desk${unique}` })).toBeVisible();
  await expect(page.getByRole("link", { name: "Later" })).toBeVisible();

  await page.getByRole("button", { name: /sign a waiver/i }).click();
  await expect(page.getByText("valid", { exact: true })).toBeVisible({ timeout: 5_000 });
});
