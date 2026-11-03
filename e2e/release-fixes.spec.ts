import { expect, test, type Page } from "@playwright/test";

// Fixes found while testing the release candidate (#149): switching logins,
// who is signed in, the desk reading a waiver, and Open in POS. Needs the demo
// login (DEMO_MODE) and freshly seeded data (`npm run db:seed`).

async function logIn(page: Page, username: string, landsOn: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(landsOn);
}

// Finds a climber in the POS, then opens their account page from the card.
async function openAccount(page: Page, name: string) {
  await page.goto("/desk/pos");
  await page.getByRole("searchbox", { name: "Search name or phone" }).fill(name);
  await page.getByRole("list", { name: "Matching climbers" }).getByText(name).click();
  await page.getByRole("link", { name: "Open account" }).click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
}

test("logging in as a climber after the desk drops the desk's access (#142)", async ({ page }) => {
  await logIn(page, "desk", /\/desk/);
  await logIn(page, "demo-valid-active", /\/me/);
  await page.goto("/desk");
  await expect(page).toHaveURL(/\/staff-only/);
  await expect(page.getByRole("heading", { name: "This page is for gym staff" })).toBeVisible();
});

test("the climber dashboard says who is signed in (#144)", async ({ page }) => {
  await logIn(page, "demo-valid-active", /\/me/);
  await expect(page.getByText("Signed in as Demo Valid-Active")).toBeVisible();

  // Switching login switches the name.
  await page.context().clearCookies();
  await logIn(page, "demo-valid-none", /\/me/);
  await expect(page.getByText("Signed in as Demo Valid-None")).toBeVisible();
  await expect(page.getByText("Signed in as Demo Valid-Active")).toHaveCount(0);
});

test("the demo QR code on /me is a real, full-size QR code (#146)", async ({ page }) => {
  await logIn(page, "demo-valid-active", /\/me/);
  const code = page.getByRole("img", { name: /Demo check-in code for ELV-/ });
  await expect(code).toBeVisible();
  // The placeholder is 25 modules (viewBox 29); a code for a link is bigger.
  const viewBox = await code.getAttribute("viewBox");
  expect(Number(viewBox?.split(" ")[2])).toBeGreaterThan(29);
  // Check in still goes through the button, not the code.
  await expect(page.getByRole("button", { name: "Simulate scan" })).toBeVisible();
});

test("the desk reads a climber's waiver from their page, and opens POS for them (#147, #148)", async ({
  page,
}) => {
  await logIn(page, "desk", /\/desk/);
  await openAccount(page, "Demo Valid-Active");

  // A valid waiver is a panel: status, signed date, expiry and wording version.
  const panel = page.locator("div", { has: page.getByText("Waiver", { exact: true }) }).filter({
    has: page.getByRole("link", { name: "Look at waiver" }),
  });
  await expect(panel.first()).toContainText("Valid");
  await expect(panel.first()).toContainText("Signed");
  await expect(panel.first()).toContainText("Expires");
  await expect(panel.first()).toContainText("Version");

  await page.getByRole("link", { name: "Look at waiver" }).click();
  await expect(page).toHaveURL(/\/desk\/waivers\/[0-9a-f-]+/);
  await expect(page.getByRole("heading", { name: "Signed waiver", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Signature" })).toBeVisible();
  await page.getByRole("link", { name: /Demo Valid-Active/ }).click();

  // One click to the POS, with this climber already picked.
  await page.getByRole("link", { name: "Open in POS" }).click();
  await expect(page).toHaveURL(/\/desk\/pos\?climber=[0-9a-f-]+/);
  await expect(page.getByText("Demo Valid-Active", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Change climber" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search name or phone" })).toHaveCount(0);
});

test("the POS opens with nobody picked for a bad or foreign climber id (#148)", async ({ page }) => {
  await logIn(page, "desk", /\/desk/);
  for (const id of ["not-an-id", "00000000-0000-4000-8000-000000000000"]) {
    await page.goto(`/desk/pos?climber=${id}`);
    await expect(page.getByRole("heading", { name: "Point of sale" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search name or phone" })).toBeVisible();
  }
});

test("a climber without a waiver shows 'No waiver' and no Look at waiver button (#147)", async ({ page }) => {
  await logIn(page, "desk", /\/desk/);
  await openAccount(page, "Demo Missing-None");
  await expect(page.getByText("No waiver", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Look at waiver" })).toHaveCount(0);
});
