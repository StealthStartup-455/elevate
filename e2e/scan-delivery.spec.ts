import { expect, test, type Browser, type Page } from "@playwright/test";

// A scan reaches the desk wherever staff are, and isn't lost until staff deal
// with it (#127): on another desk page, after a reload, and on every open desk.

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

async function scan(phone: Page) {
  await phone.getByRole("button", { name: /scan/i }).click();
  await expect(phone.getByRole("dialog")).toContainText("Sent to the desk", { timeout: 20_000 });
}

// Close every page afterwards: a desk left open keeps polling.
test.afterEach(async ({ browser }) => {
  for (const context of browser.contexts()) await context.close();
});

test("a scan shows while the desk is on the POS page", async ({ browser }) => {
  const desk = await newPage(browser);
  const phone = await newPage(browser, true);
  await logIn(desk, "desk", /\/desk/);
  await logIn(phone, "demo-missing-expired", /\/me/);

  await desk.goto("/desk/pos");
  await scan(phone);
  const popup = desk.getByRole("dialog");
  await expect(popup).toContainText("Demo Missing-Expired", { timeout: 20_000 });
  await expect(desk).toHaveURL(/\/desk\/pos/);
  await popup.getByRole("button", { name: "Close" }).click();
  await expect(popup).toHaveCount(0);
});

test("a desk reload doesn't lose the scan it was showing", async ({ browser }) => {
  const desk = await newPage(browser);
  const phone = await newPage(browser, true);
  await logIn(desk, "desk", /\/desk/);
  await logIn(phone, "demo-expired-expired", /\/me/);

  await scan(phone);
  const popup = desk.getByRole("dialog");
  await expect(popup).toContainText("Demo Expired-Expired", { timeout: 20_000 });
  await desk.reload();
  await expect(popup).toContainText("Demo Expired-Expired", { timeout: 20_000 });

  // Close deals with it: it doesn't come back after another reload.
  await popup.getByRole("button", { name: "Close" }).click();
  await desk.reload();
  await desk.waitForTimeout(6_000); // two polls
  await expect(popup).toHaveCount(0);
});

test("every open desk shows the scan, and dealing with it on one clears the others", async ({
  browser,
}) => {
  const deskA = await newPage(browser);
  const deskB = await newPage(browser);
  const phone = await newPage(browser, true);
  await logIn(deskA, "desk", /\/desk/);
  await logIn(deskB, "desk", /\/desk/);
  await logIn(phone, "demo-missing-paused", /\/me/);

  await scan(phone);
  const popupA = deskA.getByRole("dialog");
  const popupB = deskB.getByRole("dialog");
  await expect(popupA).toContainText("Demo Missing-Paused", { timeout: 20_000 });
  await expect(popupB).toContainText("Demo Missing-Paused", { timeout: 20_000 });

  await popupA.getByRole("button", { name: "Close" }).click();
  await expect(popupA).toHaveCount(0);
  await expect(popupB).toHaveCount(0, { timeout: 10_000 });
});
