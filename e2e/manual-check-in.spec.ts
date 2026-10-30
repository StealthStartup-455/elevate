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
  await expect(page.getByRole("button", { name: /manual check in/i })).toBeVisible();
  // A seeded demo climber nobody checks in during the tests.
  expect(await page.content()).not.toContain("Demo Missing-Expired");
});

test("manual check in finds a climber from a typo, searching on the server", async ({ page }) => {
  await logIn(page, "desk", /\/desk/);
  await page.getByRole("button", { name: /manual check in/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Search name or phone").fill("demo misng expird");
  const results = dialog.getByRole("list", { name: "Matching climbers" });
  await expect(results.getByText("Demo Missing-Expired")).toBeVisible();
  await results.getByText("Demo Missing-Expired").click();
  await expect(dialog).toContainText("needs a valid waiver");
});
