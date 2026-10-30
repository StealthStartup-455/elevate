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
  { user: "desk", home: /\/desk/, shown: ["Check-in", "Climbers"], hidden: ["/desk/events", "/desk/waivers"] },
  { user: "demo-valid-active", home: /\/me/, shown: ["Home"], hidden: ["/me/events", "/me/stats"] },
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
