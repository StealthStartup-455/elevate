import { expect, test, type Browser, type Page } from "@playwright/test";

// Losing the connection shows a message where it happened and lets staff or
// the climber try again, instead of a blank page or an error page (#130).

async function newPage(browser: Browser, phone = false): Promise<Page> {
  const context = await browser.newContext(
    phone ? { viewport: { width: 390, height: 844 }, isMobile: true } : {},
  );
  return context.newPage();
}

async function logIn(page: Page, username: string, landsOn: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(landsOn);
}

test.afterEach(async ({ browser }) => {
  for (const context of browser.contexts()) await context.close();
});

test("a scan while the phone is offline says so, and works once back online", async ({
  browser,
}) => {
  const phone = await newPage(browser, true);
  await logIn(phone, "demo-valid-expired", /\/me/);

  await phone.context().setOffline(true);
  await phone.getByRole("button", { name: /scan/i }).click();
  const dialog = phone.getByRole("dialog");
  await expect(dialog).toContainText("Couldn't reach the gym", { timeout: 20_000 });
  await dialog.getByRole("button", { name: "Back to menu" }).click();

  await phone.context().setOffline(false);
  await phone.getByRole("button", { name: /scan/i }).click();
  await expect(dialog).toContainText("Sent to the desk", { timeout: 20_000 });

  // Deal with the scan so it doesn't pop up in later tests.
  const desk = await newPage(browser);
  await logIn(desk, "desk", /\/desk/);
  const popup = desk.getByRole("dialog");
  await expect(popup).toContainText("Demo Valid-Expired", { timeout: 20_000 });
  await popup.getByRole("button", { name: "Close" }).click();
  await expect(popup).toHaveCount(0);
});

test("a desk action while offline shows a message in the popup, and the popup stays", async ({
  browser,
}) => {
  const desk = await newPage(browser);
  const phone = await newPage(browser, true);
  await logIn(desk, "desk", /\/desk/);
  // Valid waiver, no membership: the popup offers a free day pass.
  await logIn(phone, "demo-valid-none", /\/me/);

  await phone.getByRole("button", { name: /scan/i }).click();
  const popup = desk.getByRole("dialog");
  await expect(popup).toContainText("Demo Valid-None", { timeout: 20_000 });

  await desk.context().setOffline(true);
  await popup.getByRole("button", { name: "Give free day pass" }).click();
  await expect(popup).toContainText("Couldn't reach the server");
  await expect(popup).toContainText("Demo Valid-None");

  await desk.context().setOffline(false);
  await popup.getByRole("button", { name: "Close" }).click();
  await expect(popup).toHaveCount(0);
});
