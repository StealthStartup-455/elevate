import { expect, test, type Browser, type Page } from "@playwright/test";
import { openTab, pressScan } from "./climber";
import { arrivalToast, clearArrival } from "./desk-arrivals";

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
  // Open the Check in tab while still online; the connection drops on that screen.
  await openTab(phone, "Check in");

  await phone.context().setOffline(true);
  await pressScan(phone);
  const dialog = phone.getByRole("dialog");
  await expect(dialog).toContainText("Couldn't reach the gym", { timeout: 20_000 });
  await dialog.getByRole("button", { name: "Back to menu" }).click();

  await phone.context().setOffline(false);
  await pressScan(phone);
  await expect(dialog).toContainText("Sent to the desk", { timeout: 20_000 });

  // Deal with the scan so it doesn't show in later tests.
  const desk = await newPage(browser);
  await logIn(desk, "desk", /\/desk/);
  await expect(arrivalToast(desk, "Demo Valid-Expired")).toBeVisible({ timeout: 20_000 });
  await clearArrival(desk, "Demo Valid-Expired");
});

test("a scan while the desk is offline shows once the desk is back online", async ({
  browser,
}) => {
  const desk = await newPage(browser);
  const phone = await newPage(browser, true);
  await logIn(desk, "desk", /\/desk/);
  await logIn(phone, "demo-valid-none", /\/me/);

  await desk.context().setOffline(true);
  await pressScan(phone);
  await expect(phone.getByRole("dialog")).toContainText("Sent to the desk", { timeout: 20_000 });
  await desk.waitForTimeout(6_000); // two failed polls
  await expect(arrivalToast(desk, "Demo Valid-None")).toHaveCount(0);

  // The scan waited in the database, so nothing is lost.
  await desk.context().setOffline(false);
  await expect(arrivalToast(desk, "Demo Valid-None")).toContainText("No membership", { timeout: 20_000 });
  await clearArrival(desk, "Demo Valid-None");
});
