import { expect, test, type Browser, type Page } from "@playwright/test";

// The Milestone 3 demo, end to end: a climber on a phone and the front desk
// on a laptop, each in its own browser session. Needs the demo login
// (DEMO_MODE) and freshly seeded data (`npm run db:seed`).

async function logIn(page: Page, username: string, landsOn: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(landsOn);
}

async function newPage(browser: Browser, phone = false): Promise<Page> {
  const context = await browser.newContext(
    phone ? { viewport: { width: 390, height: 844 }, isMobile: true } : {},
  );
  return context.newPage();
}

test("protected pages send logged-out visitors to log in", async ({ page }) => {
  await page.goto("/desk");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/me");
  await expect(page).toHaveURL(/\/login/);
});

test("a climber's session can't open the front desk", async ({ browser }) => {
  const phone = await newPage(browser, true);
  await logIn(phone, "demo-valid-active", /\/me/);
  await phone.goto("/desk");
  await expect(phone).toHaveURL(/\/login/);
});

test("a member scans in, the desk checks them in once", async ({ browser }) => {
  const desk = await newPage(browser);
  const phone = await newPage(browser, true);
  await logIn(desk, "desk", /\/desk/);
  await logIn(phone, "demo-valid-active", /\/me/);

  // First scan: the desk pops up the member and checks them in.
  await phone.getByRole("button", { name: /scan/i }).click();
  const popup = desk.getByRole("dialog");
  await expect(popup).toContainText("Demo Valid-Active", { timeout: 20_000 });
  await popup.getByRole("button", { name: "Check in" }).click();
  await expect(popup).toContainText("is checked in");
  await popup.getByRole("button", { name: "Close" }).click();

  // Second scan within two hours: shown again, but not counted twice.
  await phone.keyboard.press("Escape");
  await phone.reload();
  await phone.getByRole("button", { name: /scan/i }).click();
  await expect(popup).toContainText("Demo Valid-Active", { timeout: 20_000 });
  await popup.getByRole("button", { name: "Check in" }).click();
  await expect(popup).toContainText("Already checked in");
});

test("a new climber joins, signs the waiver and reaches their account", async ({ browser }) => {
  const phone = await newPage(browser, true);
  const desk = await newPage(browser);
  await logIn(desk, "desk", /\/desk/);

  const unique = Date.now().toString().slice(-6);
  await phone.goto("/join");
  await phone.getByLabel("First name").fill("Taylor");
  await phone.getByLabel("Last name").fill(`Test${unique}`);
  await phone.getByLabel("Phone number").fill(`250555${unique.slice(-4)}`);
  await phone.getByLabel("Date of birth").fill("1995-03-03");
  await phone.getByRole("button", { name: "Create account" }).click();
  await phone.getByRole("button", { name: /sign a waiver/i }).click();
  await phone.getByRole("link", { name: "Continue" }).click({ timeout: 20_000 });
  await expect(phone).toHaveURL(/\/me/);

  // Known gap (proposal item D1): a new climber has no membership yet, so the
  // desk is told why it can't check them in instead of offering Check in.
  await phone.getByRole("button", { name: /scan/i }).click();
  const popup = desk.getByRole("dialog");
  await expect(popup).toContainText(`Taylor Test${unique}`, { timeout: 20_000 });
  await expect(popup).toContainText("has no active membership");
  await expect(popup.getByRole("button", { name: "Check in" })).toHaveCount(0);
});
