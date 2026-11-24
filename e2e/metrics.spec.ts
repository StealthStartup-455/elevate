import { expect, test, type Page } from "@playwright/test";

// The value proposition metrics page (#251): managers see it, desk staff
// don't, and a try at the desk shows up on it. Needs the demo logins
// (DEMO_MODE) and seeded data, like smoke.spec.ts.

async function logIn(page: Page, username: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/desk/);
}

test("desk staff don't get the metrics page", async ({ page }) => {
  await logIn(page, "desk");
  await expect(page.getByRole("navigation").getByRole("link", { name: "Metrics", exact: true })).toHaveCount(0);
  await page.goto("/desk/metrics");
  await expect(page.getByText("Only managers and owners can see metrics.")).toBeVisible();
});

test("a blocked climber sent away at the desk shows on the manager's metrics", async ({ page }) => {
  await logIn(page, "manager");
  // Pick a climber who can't be checked in, then close: "sent away".
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check in" });
  await dialog.getByLabel("Search name, phone or V number").fill("demo missing expired");
  await dialog.getByRole("list", { name: "Matching climbers" }).getByText("Demo Missing-Expired").click();
  await expect(dialog).toContainText("needs a valid waiver");
  // Escape closes it (focus first: the picked result's button is gone).
  await dialog.getByRole("heading", { name: "Check in" }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.getByRole("navigation").getByRole("link", { name: "Metrics", exact: true }).click();
  await expect(page).toHaveURL(/\/desk\/metrics$/);
  await expect(page.getByRole("heading", { name: "Metrics", level: 1 })).toBeVisible();
  const desk = page.getByRole("region", { name: "Fast, seamless front desk" });
  await expect(desk).toBeVisible();
  // The record is saved while the dialog closes, so reload until it shows.
  await expect(async () => {
    await page.reload();
    await expect(desk).toContainText("Blocked and not checked in");
  }).toPass({ timeout: 15_000 });
  await expect(page.getByRole("table", { name: "Front desk day by day" })).toBeVisible();
  await expect(page.getByText("Demo data.")).toBeVisible();
});
