import { expect, test, type Page } from "@playwright/test";

// Generated busyness data is labelled wherever it shows (#64), so nobody in a
// demo takes it for a real gym's numbers. The e2e server runs the "moderate"
// scenario (.env, CI), so both labels should appear. Needs the demo login.

async function logIn(page: Page, username: string, landsOn: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(landsOn);
}

test("the desk labels sample check-ins and the sample week", async ({ page }) => {
  await logIn(page, "desk", /\/desk/);
  await expect(page.getByTestId("sample-check-ins")).toContainText("samples, not real visits");
  await expect(page.getByTestId("sample-week").first()).toContainText("sample week");
});

test("a climber sees the same labels on their busyness card", async ({ page }) => {
  await logIn(page, "demo-valid-active", /\/me/);
  await expect(page.getByTestId("sample-check-ins")).toContainText("sample check-ins");
  await expect(page.getByTestId("sample-week").first()).toContainText("sample week");
});
