import { expect, test, type Page } from "@playwright/test";

// A member keeps a mock EFT bank account on file for their monthly
// membership (#179), and the desk sees it on the POS climber card. Needs the
// demo login (DEMO_MODE) and the seeded demo climbers (`npm run db:seed`).

async function logIn(page: Page, username: string, lands: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(lands);
}

test("a member adds a bank account, the desk sees it on the POS, then the member removes it", async ({
  browser,
}) => {
  const member = await (await browser.newContext()).newPage();
  await logIn(member, "demo-valid-active", /\/me/);
  const card = member.locator("main").getByRole("heading", { name: "Monthly payments" }).locator("../../..");

  // Start clean if an earlier run left one behind.
  if (await card.getByRole("button", { name: "Remove" }).isVisible()) {
    await card.getByRole("button", { name: "Remove" }).click();
    await member.getByRole("dialog").getByRole("button", { name: "Remove bank account" }).click();
  }
  await card.getByRole("button", { name: "Add bank account" }).click();

  const dialog = member.getByRole("dialog", { name: "Add bank account" });
  await dialog.getByLabel("Name on the account").fill("Demo Member");
  await dialog.getByLabel("Transit number").fill("12");
  await dialog.getByLabel("Institution number").fill("003");
  await dialog.getByLabel("Account number").fill("1234567890");
  await dialog.getByRole("button", { name: "Save bank account" }).click();
  // Bad transit number, and the debit not agreed to.
  await expect(dialog).toContainText("5-digit transit number");
  await expect(dialog).toContainText("Agree to the pre-authorized debit");

  await dialog.getByLabel("Transit number").fill("01234");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Save bank account" }).click();
  await expect(dialog).toBeHidden();
  await expect(card).toContainText("RBC ••••7890");
  await expect(card).not.toContainText("1234567890");

  const desk = await (await browser.newContext()).newPage();
  await logIn(desk, "desk", /\/desk/);
  await desk.getByRole("link", { name: "POS", exact: true }).click();
  await desk.getByRole("searchbox", { name: "Search name or phone" }).fill("Demo Valid-Active");
  await desk.getByRole("list", { name: "Matching climbers" }).getByText("Demo Valid-Active").click();
  await expect(desk.getByText("EFT on file: RBC ••••7890")).toBeVisible();

  await card.getByRole("button", { name: "Remove" }).click();
  await member.getByRole("dialog", { name: "Remove bank account" }).getByRole("button", { name: "Remove bank account" }).click();
  await expect(card).toContainText("No bank account on file.");
});

test("the desk adds a member's bank account on the customer page and sees it on the POS", async ({ page }) => {
  await logIn(page, "desk", /\/desk/);
  await page.getByRole("link", { name: "POS", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search name or phone" }).fill("Demo Valid-Paused");
  await page.getByRole("list", { name: "Matching climbers" }).getByText("Demo Valid-Paused").click();
  await page.getByRole("link", { name: "Open account" }).click();
  await expect(page.getByRole("heading", { name: "Demo Valid-Paused" })).toBeVisible();
  // Not `main`: while the page streams there can briefly be two (see the #168 entry).
  const main = page.locator("body");

  // Start clean if an earlier run left one behind.
  if (await main.getByRole("button", { name: "Remove" }).isVisible()) {
    await main.getByRole("button", { name: "Remove" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Remove bank account" }).click();
  }
  await expect(main).toContainText("No EFT bank account on file");
  await main.getByRole("button", { name: "Add bank account" }).click();

  const dialog = page.getByRole("dialog", { name: "Add bank account" });
  await expect(dialog).toContainText("For Demo Valid-Paused");
  await dialog.getByLabel("Name on the account").fill("Demo Paused");
  await dialog.getByLabel("Transit number").fill("01234");
  await dialog.getByLabel("Institution number").fill("004");
  await dialog.getByLabel("Account number").fill("5555111");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Save bank account" }).click();
  await expect(dialog).toBeHidden();
  await expect(main).toContainText("EFT on file: TD ••••5111");
  await expect(main).toContainText("Demo Paused · Transit 01234");

  // Still there after a reload, and on the POS card.
  await page.reload();
  await expect(main).toContainText("EFT on file: TD ••••5111");
  await page.goto("/desk/pos");
  await page.getByRole("searchbox", { name: "Search name or phone" }).fill("Demo Valid-Paused");
  await page.getByRole("list", { name: "Matching climbers" }).getByText("Demo Valid-Paused").click();
  await expect(page.getByText("EFT on file: TD ••••5111")).toBeVisible();
  // Once: a shared React key once drew the line three times.
  await expect(page.getByText(/EFT on file/)).toHaveCount(1);

  // Removed from the POS card.
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page.getByRole("dialog", { name: "Remove bank account" }).getByRole("button", { name: "Remove bank account" }).click();
  await expect(page.getByText("No EFT bank account on file")).toBeVisible();
});
