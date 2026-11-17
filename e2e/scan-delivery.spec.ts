import { expect, test, type Browser, type Page } from "@playwright/test";
import { pressScan } from "./climber";
import { arrivalToast, clearArrival, expectNotWaiting } from "./desk-arrivals";

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
  await pressScan(phone);
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
  const toast = arrivalToast(desk, "Demo Missing-Expired");
  await expect(toast).toContainText("No waiver signed", { timeout: 20_000 });
  // A toast, not a dialog: staff stay on the POS.
  await expect(desk).toHaveURL(/\/desk\/pos/);
  await expect(desk.locator(".MuiDialog-root")).toHaveCount(0);
  await toast.getByRole("button", { name: /^Dismiss/ }).click();
  await expect(toast).toHaveCount(0);
  // Dismissing only hides the toast: the arrival is still waiting.
  await clearArrival(desk, "Demo Missing-Expired");
});

test("a desk reload doesn't lose a waiting scan", async ({ browser }) => {
  const desk = await newPage(browser);
  const phone = await newPage(browser, true);
  await logIn(desk, "desk", /\/desk/);
  await logIn(phone, "demo-expired-expired", /\/me/);

  await scan(phone);
  const toast = arrivalToast(desk, "Demo Expired-Expired");
  await expect(toast).toBeVisible({ timeout: 20_000 });
  await desk.reload();
  // Already announced in this tab, so no second toast, but still in Arrivals.
  await expect(desk.getByRole("button", { name: /^Arrivals/ })).toBeVisible({ timeout: 20_000 });

  // Clear deals with it: it doesn't come back after another reload.
  await clearArrival(desk, "Demo Expired-Expired");
  await desk.reload();
  await desk.waitForTimeout(6_000); // two polls
  await expectNotWaiting(desk, "Demo Expired-Expired");
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
  const toastA = arrivalToast(deskA, "Demo Missing-Paused");
  const toastB = arrivalToast(deskB, "Demo Missing-Paused");
  await expect(toastA).toBeVisible({ timeout: 20_000 });
  await expect(toastB).toBeVisible({ timeout: 20_000 });

  await clearArrival(deskA, "Demo Missing-Paused");
  await expect(toastB).toHaveCount(0, { timeout: 10_000 });
  await expectNotWaiting(deskB, "Demo Missing-Paused");
});

test("two quick scans are two toasts, and neither replaces the other", async ({ browser }) => {
  test.slow(); // two phones log in and scan
  const desk = await newPage(browser);
  const phoneA = await newPage(browser, true);
  const phoneB = await newPage(browser, true);
  await logIn(desk, "desk", /\/desk/);
  await logIn(phoneA, "demo-valid-active", /\/me/);
  await logIn(phoneB, "demo-missing-none", /\/me/);

  await scan(phoneA);
  await scan(phoneB);
  await expect(arrivalToast(desk, "Demo Valid-Active")).toContainText("Ready to check in", { timeout: 20_000 });
  await expect(arrivalToast(desk, "Demo Missing-None")).toContainText("Can't check in yet", { timeout: 20_000 });
  await clearArrival(desk, "Demo Valid-Active");
  await clearArrival(desk, "Demo Missing-None");
});
