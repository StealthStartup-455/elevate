import { expect, test } from "@playwright/test";

// The (i) next to "Log in" tells testers what to try and which logins to use,
// by kind of user. Needs the demo login (DEMO_MODE) and seeded data.

test("the (i) on the login card shows the testing guide", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Show demo accounts" }).hover();
  const tip = page.getByRole("tooltip");
  await expect(tip).toContainText("Testing guide");
  await expect(tip).toContainText("Front desk");
  await expect(tip).toContainText("Membership tab");
  await expect(tip).toContainText("demo-missing-none");
});

test("the (i) lists test logins by user type, and the ones shown work", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Show demo accounts" }).hover();
  const tip = page.getByRole("tooltip");
  await expect(tip).toContainText("Front desk (staff)");
  await expect(tip).toContainText("Climbers by waiver and membership");
  await expect(tip).toContainText("Climbers by name");
  await expect(tip).toContainText("desk@elevate.test");
  // The password column is shown, not only the usernames.
  await expect(tip.getByRole("columnheader", { name: "Password" }).first()).toBeVisible();

  for (const [user, lands] of [
    ["desk", /\/desk/],
    ["demo-missing-none", /\/me/],
    ["maya.patel", /\/me/],
  ] as const) {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill(user);
    await page.getByLabel("Password").fill(user);
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    await expect(page).toHaveURL(lands);
  }
});
