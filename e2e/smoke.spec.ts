import { expect, test, type Browser, type Page } from "@playwright/test";
import { openTab, pressScan } from "./climber";
import { arrivalToast, clearArrival, expectNotWaiting, openArrival } from "./desk-arrivals";
import { signWaiverForm } from "./sign-waiver";

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

// A wavy line across the signature box, with the mouse.
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
  // Told the desk is for staff, not sent to log in as if logged out (#87).
  await expect(phone).toHaveURL(/\/staff-only/);
  await expect(phone.getByRole("heading", { name: "This page is for gym staff" })).toBeVisible();
  await phone.getByRole("link", { name: /go to your dashboard/i }).click();
  await expect(phone).toHaveURL(/\/me/);
});

test("a member scans in, the desk checks them in once", async ({ browser }) => {
  const desk = await newPage(browser);
  const phone = await newPage(browser, true);
  await logIn(desk, "desk", /\/desk/);
  await logIn(phone, "demo-valid-active", /\/me/);

  // First scan: a toast says they're ready (not checked in), and staff open them.
  await pressScan(phone);
  const toast = arrivalToast(desk, "Demo Valid-Active");
  await expect(toast).toContainText("Ready to check in", { timeout: 20_000 });
  await expect(toast).not.toContainText("Checked in");
  const panel = await openArrival(desk, "Demo Valid-Active");
  await panel.getByRole("button", { name: "Check in" }).click();
  await expect(panel).toContainText("Checked in at");
  // Checking in deals with the scan on every desk (#225).
  await expectNotWaiting(desk, "Demo Valid-Active");

  // Second scan within two hours: the toast says they're already in, and the
  // scan clears itself once the toast goes, so nothing waits in Arrivals (#225).
  // Toasts make way for the climber panel, so close it first (#228 review).
  await panel.getByRole("button", { name: "Close" }).first().click();
  await expect(desk).not.toHaveURL(/climber=/);
  await phone.keyboard.press("Escape");
  await phone.reload();
  await pressScan(phone);
  await expect(toast).toContainText("Already checked in at", { timeout: 20_000 });
  await expect(toast).not.toContainText("Ready to check in");
  await toast.getByRole("button", { name: /^Dismiss/ }).click();
  await expectNotWaiting(desk, "Demo Valid-Active");
});

test("a scan made before the desk opens still shows when it opens", async ({ browser }) => {
  const phone = await newPage(browser, true);
  const desk = await newPage(browser);
  await logIn(phone, "demo-expired-active", /\/me/);
  // Scan while nobody is at the desk, and wait until the phone says it's sent.
  await pressScan(phone);
  await expect(phone.getByRole("dialog")).toContainText("Sent to the desk", { timeout: 20_000 });

  // The desk opens afterwards: the arrival is waiting for it (#127).
  await logIn(desk, "desk", /\/desk/);
  const toast = arrivalToast(desk, "Demo Expired-Active");
  await expect(toast).toContainText("Can't check in yet", { timeout: 20_000 });
  await expect(toast).toContainText("Waiver expired");
  await clearArrival(desk, "Demo Expired-Active");
});

test("a scan never interrupts manual check in, and the toast goes after 10 seconds", async ({ browser }) => {
  const desk = await newPage(browser);
  const phone = await newPage(browser, true);
  await logIn(desk, "desk", /\/desk/);
  await logIn(phone, "demo-valid-paused", /\/me/);

  await desk.getByRole("button", { name: /manual check in/i }).click();
  const dialog = desk.getByRole("dialog");
  await expect(dialog).toHaveCount(1);
  const search = dialog.getByLabel("Search name or phone");
  await search.fill("Demo");

  await pressScan(phone);
  // MUI hides everything outside an open dialog from screen readers, so look
  // for the toast on screen rather than by role.
  const toast = desk.locator('[role="status"]').filter({ hasText: "Demo Valid-Paused" });
  await expect(toast).toContainText("Membership paused", { timeout: 20_000 });
  // The dialog stays open with what staff typed, and keeps the keyboard (#225).
  await expect(dialog).toHaveCount(1);
  await expect(dialog).toContainText("Manual check in");
  await expect(search).toHaveValue("Demo");
  await expect(search).toBeFocused();
  // Only one dialog ever: the arrival isn't one.
  await expect(desk.locator(".MuiDialog-root")).toHaveCount(1);

  await expect(toast).toHaveCount(0, { timeout: 15_000 });
  // Gone from the corner, but still waiting in Arrivals.
  await desk.keyboard.press("Escape");
  await clearArrival(desk, "Demo Valid-Paused");
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
  await phone.getByRole("link", { name: /sign the waiver/i }).click();
  await expect(phone).toHaveURL(/\/me\/waiver/);
  await signWaiverForm(phone);
  await expect(phone.getByText(/You.re all set/)).toBeVisible();
  await phone.getByRole("link", { name: "Continue" }).click();
  await expect(phone).toHaveURL(/\/me$/);
  await openTab(phone, "Check in");
  await expect(phone.getByRole("main").getByText("Waiver signed", { exact: true }).first()).toBeVisible();

  // Known gap (proposal item D1): a new climber has no membership yet, so the
  // desk is told why it can't check them in instead of offering Check in.
  await pressScan(phone);
  const toast = arrivalToast(desk, `Taylor Test${unique}`);
  await expect(toast).toContainText("Can't check in yet", { timeout: 20_000 });
  await expect(toast).toContainText("No membership, day pass or punch card");
  await expect(toast).not.toContainText("No waiver signed");
  await clearArrival(desk, `Taylor Test${unique}`);
});
