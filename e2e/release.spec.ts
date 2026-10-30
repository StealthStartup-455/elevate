import { expect, test, type Browser, type Page } from "@playwright/test";
import { signWaiverForm } from "./sign-waiver";

// Release check (#43): the pilot journey from start to finish, in the order a
// new climber meets it. One test, so a failure says which step of the journey
// broke. It covers the five workflows #43 names: sign in, waiver status,
// purchase, check in and busyness.
//
// Run it before calling a build a release candidate, and before any demo:
//   npm run test:release                                  (local build)
//   E2E_BASE_URL="https://<staging url>" npm run test:release   (hosted)
// It adds a climber and a check in, so reseed a hosted demo afterwards.
// Needs the demo login (DEMO_MODE). What it can't check yet is listed under
// "Release checks" in DEPLOYMENT.md.

async function newPage(browser: Browser, phone = false): Promise<Page> {
  const context = await browser.newContext(
    phone ? { viewport: { width: 390, height: 844 }, isMobile: true } : {},
  );
  return context.newPage();
}

// Close the desk afterwards: a desk left open keeps polling and would take
// the scans of the tests that run after this one.
test.afterEach(async ({ browser }) => {
  for (const context of browser.contexts()) await context.close();
});

async function logIn(page: Page, username: string, landsOn: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(landsOn);
}

// "28 check-ins in the last 2 hours" on the desk.
async function deskCount(desk: Page): Promise<number> {
  const heading = desk.getByRole("heading", { name: /check-ins in the last/ });
  const text = (await heading.textContent()) ?? "";
  const match = text.match(/^(\d+) check-ins/);
  if (!match) throw new Error(`No check-in count in "${text}"`);
  return Number(match[1]);
}

test("release check: a new climber joins, signs, logs back in, buys a pass and checks in", async ({
  browser,
}) => {
  const desk = await newPage(browser);
  const phone = await newPage(browser, true);
  const unique = Date.now().toString().slice(-6);
  const firstName = "Riley";
  const lastName = `Release${unique}`;
  const name = `${firstName} ${lastName}`;
  // The demo login's username for a new climber (features/auth/mock-users.ts).
  const username = `${firstName}.${lastName}`.toLowerCase();

  await test.step("sign in: logged out visitors are sent to log in; the desk logs in", async () => {
    await desk.goto("/desk");
    await expect(desk).toHaveURL(/\/login/);
    await logIn(desk, "desk", /\/desk$/);
  });
  const countBefore = await deskCount(desk);

  await test.step("join: a new climber registers on their phone", async () => {
    await phone.goto("/join");
    await phone.getByLabel("First name").fill(firstName);
    await phone.getByLabel("Last name").fill(lastName);
    await phone.getByLabel("Phone number").fill(`250559${unique.slice(-4)}`);
    await phone.getByLabel("Date of birth").fill("1993-07-07");
    await phone.getByRole("button", { name: "Create account" }).click();
    await expect(phone.getByText("You're registered.")).toBeVisible();
  });

  await test.step("waiver status: missing until signed, then signed", async () => {
    await phone.goto("/me");
    // Scoped to <main>: while /me streams in, a second copy of the card can
    // briefly sit outside it (also seen on /desk/climbers/new in PR #115).
    await expect(phone.getByRole("main").getByText("No waiver on file")).toBeVisible();
    await phone.getByRole("main").getByRole("link", { name: "Sign the waiver" }).click();
    await expect(phone).toHaveURL(/\/me\/waiver/);
    await signWaiverForm(phone);
    await expect(phone.getByText(/You.re all set/)).toBeVisible();
    await phone.getByRole("link", { name: "Continue" }).click();
    await expect(phone).toHaveURL(/\/me$/);
    await expect(phone.getByRole("main").getByText("✓ Waiver signed")).toBeVisible({ timeout: 5_000 });
    // Still signed after a fresh load: it was saved, not just shown.
    await phone.reload();
    await expect(phone.getByRole("main").getByText("✓ Waiver signed")).toBeVisible();
  });

  await test.step("sign in again: the climber logs out and back in", async () => {
    await phone.getByRole("button", { name: "Log out" }).click();
    await expect(phone).not.toHaveURL(/\/me/);
    await phone.goto("/me");
    await expect(phone).toHaveURL(/\/login/);
    await logIn(phone, username, /\/me$/);
    await expect(phone.getByRole("main").getByText("✓ Waiver signed")).toBeVisible();
  });

  const popup = desk.getByRole("dialog");

  await test.step("purchase: the desk gives a day pass to a climber with no membership", async () => {
    await phone.getByRole("button", { name: /scan/i }).click();
    await expect(popup).toContainText(name, { timeout: 20_000 });
    await expect(popup).toContainText("has no active membership");
    // The no-charge day pass is the stopgap until the POS (#53, PR #119);
    // then this step sells a day pass there.
    await popup.getByRole("button", { name: "Give free day pass" }).click();
    await expect(popup.getByRole("button", { name: "Check in" })).toBeEnabled();
  });

  await test.step("check in: the desk checks them in once", async () => {
    await popup.getByRole("button", { name: "Check in" }).click();
    await expect(popup).toContainText("is checked in");
    await popup.getByRole("button", { name: "Close" }).click();
    await expect(popup).toHaveCount(0);
  });

  await test.step("busyness: the desk and the climber both count the new visit", async () => {
    await desk.reload();
    await expect(desk.getByRole("table").filter({ hasText: name })).toBeVisible();
    await expect.poll(() => deskCount(desk)).toBe(countBefore + 1);

    await phone.goto("/me");
    await expect(phone.getByRole("main").getByText(`~${countBefore + 1} climbers here`)).toBeVisible();
  });
});
