import { expect, test, type Page } from "@playwright/test";

// Empty pages stay out of the menus until they have content, so a gym owner
// in a demo never clicks into a blank page (#65). The routes still work.
// Needs the demo login (DEMO_MODE), like smoke.spec.ts.

async function logIn(page: Page, username: string, landsOn: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(landsOn);
}

const menus = [
  { user: "desk", home: /\/desk/, shown: ["Check-in", "Customers", "Events"], hidden: ["/desk/waivers"] },
  { user: "demo-valid-active", home: /\/me/, shown: ["Home", "Check in", "Membership", "Classes"], hidden: ["/me/stats"] },
];

for (const { user, home, shown, hidden } of menus) {
  test(`${user}'s menu leaves out empty pages, which still load`, async ({ page }) => {
    await logIn(page, user, home);
    const nav = page.getByRole("navigation");
    for (const name of shown) await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
    for (const path of hidden) {
      await expect(nav.locator(`a[href="${path}"]`)).toHaveCount(0);
      const response = await page.goto(path);
      expect(response?.ok()).toBe(true);
    }
  });
}

test("the desk marks the page you're on, and old Climbers links open Customers", async ({ page }) => {
  await logIn(page, "desk", /\/desk/);
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "Check-in", exact: true })).toHaveAttribute("aria-current", "page");

  await nav.getByRole("link", { name: "Customers", exact: true }).click();
  await expect(page).toHaveURL(/\/desk\/customers$/);
  await expect(nav.getByRole("link", { name: "Customers", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Check-in", exact: true })).not.toHaveAttribute("aria-current", "page");

  // The pages used to live under /desk/climbers.
  await page.goto("/desk/climbers/new?from=bookmark");
  await expect(page).toHaveURL(/\/desk\/customers\/new\?from=bookmark$/);
  await page.goto("/desk/climbers");
  await expect(page).toHaveURL(/\/desk\/customers$/);
  await expect(page.getByRole("heading", { name: "Customers", level: 1 })).toBeVisible();
});
