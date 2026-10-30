import { expect, test } from "@playwright/test";

// The (i) next to "Log in" tells testers what to try and which logins to use.

test("the (i) on the login card shows the testing guide", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Show demo accounts" }).hover();
  const tip = page.getByRole("tooltip");
  await expect(tip).toContainText("Testing guide");
  await expect(tip).toContainText("Front desk");
  await expect(tip).toContainText("Membership tab");
  await expect(tip).toContainText("demo-missing-none");
});
