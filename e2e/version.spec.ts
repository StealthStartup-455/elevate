import { expect, test, type Page } from "@playwright/test";

// /api/version reports the build's version (#43); the Deploy staging workflow
// relies on it to confirm a deploy is live. Staff see the same version on the
// desk and climbers in About on /me; login and join show none (#103).

async function logIn(page: Page, username: string, landsOn: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(landsOn);
}

test("the desk, About on /me and /api/version show the same version", async ({
  browser,
  request,
}) => {
  const response = await request.get("/api/version");
  expect(response.ok()).toBe(true);
  const info = await response.json();
  expect(info.version).toMatch(/^v\d+\.\d+\.\d+(-dev\.\d+)?\+[0-9a-z.]+$/);

  const desk = await (await browser.newContext()).newPage();
  await logIn(desk, "desk", /\/desk/);
  await expect(desk.getByTestId("app-version")).toHaveText(info.version);

  const phone = await (await browser.newContext()).newPage();
  await logIn(phone, "demo-valid-active", /\/me/);
  await expect(phone.getByText("About: Elevate")).toBeVisible();
  await expect(phone.getByTestId("app-version")).toHaveText(info.version);
});

test("login and join show no version", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /log in|sign in/i })).toBeVisible();
  await expect(page.getByTestId("app-version")).toHaveCount(0);
  await page.goto("/join");
  await expect(page.getByRole("heading").first()).toBeVisible();
  await expect(page.getByTestId("app-version")).toHaveCount(0);
});
