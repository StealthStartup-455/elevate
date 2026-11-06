import { expect, test, type Page } from "@playwright/test";

// The front desk's Check-in page: the day's check-ins from the database, the
// day in the URL, paging, the filter, Busy times and Find climber. Needs the
// demo login and seeded data (the seed saves check-ins earlier today).

async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("desk");
  await page.getByLabel("Password").fill("desk");
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/desk/);
}

// Inside <main>: while the page streams in, a second copy can briefly sit
// outside it (the same as /me and /desk/customers/new).
const main = (page: Page) => page.getByRole("main");
const table = (page: Page) => main(page).getByRole("table", { name: /check-ins? (today|on )/ });

test("the Check-in page lists today's check-ins with badge, waiver and message", async ({ page }) => {
  await logIn(page);
  await expect(page.getByRole("heading", { name: "Check-in", level: 1 })).toBeVisible();
  await expect(main(page).getByText(/^\d+ check-ins? today$/)).toBeVisible();

  const rows = table(page).getByRole("row");
  // A header row and at least one seeded check-in, at most 25 a page.
  expect(await rows.count()).toBeGreaterThan(1);
  expect(await rows.count()).toBeLessThanOrEqual(26);
  await expect(table(page).getByText("Member").first()).toBeVisible();
  await expect(table(page).getByText(/Gym access|First visit/).first()).toBeVisible();
  await expect(main(page).getByText(/^1–\d+ of \d+$/)).toBeVisible();
});

test("the day and page live in the URL, and bad values fall back to today and page 1", async ({ page }) => {
  await logIn(page);
  await page.goto("/desk?date=2026-02-30&page=abc");
  await expect(main(page).getByText(/check-ins? today$/)).toBeVisible();
  await expect(main(page).getByText(/^Page 1 of \d+$/)).toBeVisible();

  // A day nobody checked in.
  await page.goto("/desk?date=2025-01-01");
  await expect(main(page).getByText("0 check-ins on Jan 1, 2025")).toBeVisible();
  await expect(main(page).getByText("No check-ins on this day.")).toBeVisible();

  // ‹ goes back a day; Today comes back.
  await page.getByRole("link", { name: "Previous day" }).click();
  await expect(page).toHaveURL(/\?date=2024-12-31$/);
  await page.getByRole("link", { name: "Today" }).click();
  await expect(page).toHaveURL(/\/desk$/);
  await expect(main(page).getByText(/check-ins? today$/)).toBeVisible();
});

test("paging moves through the day 25 at a time", async ({ page }) => {
  await logIn(page);
  const range = (await main(page).getByText(/^1–\d+ of \d+$/).textContent()) ?? "";
  const total = Number(range.split(" of ")[1]);
  test.skip(total <= 25, "Fewer than 26 check-ins today (the seed ran just after midnight)");

  await page.getByRole("link", { name: "Next page" }).click();
  await expect(page).toHaveURL(/\?page=2$/);
  await expect(main(page).getByText(new RegExp(`^26–\\d+ of ${total}$`))).toBeVisible();
  await page.getByRole("link", { name: "Previous page" }).click();
  await expect(page).toHaveURL(/\/desk$/);
});

test("Filter list narrows this page by name", async ({ page }) => {
  await logIn(page);
  const firstName = (await table(page).getByRole("link").first().textContent()) ?? "";
  const filter = page.getByRole("searchbox", { name: "Filter this page by name" });

  await filter.fill(firstName);
  await expect(table(page).getByRole("link", { name: firstName }).first()).toBeVisible();
  await filter.fill("zzz nobody");
  await expect(main(page).getByText('No one on this page matches "zzz nobody".')).toBeVisible();
});

test("the row menu opens the climber, and names link to their page", async ({ page }) => {
  await logIn(page);
  const name = (await table(page).getByRole("link").first().textContent()) ?? "";
  await page.getByRole("button", { name: `More for ${name}` }).first().click();
  await page.getByRole("menuitem", { name: "Open climber" }).click();
  await expect(page).toHaveURL(/\/desk\/customers\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
});

test("Busy times opens the typical week and closes again", async ({ page }) => {
  await logIn(page);
  await page.getByRole("button", { name: "Busy times" }).click();
  const dialog = page.getByRole("dialog", { name: "Busy times" });
  await expect(dialog.getByRole("group", { name: "Typical busyness by day and hour" })).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toHaveCount(0);
});

test("Find climber searches on the server and opens the climber's panel", async ({ page }) => {
  await logIn(page);
  await page.getByRole("combobox", { name: "Find climber" }).fill("tyler le");
  await page.getByRole("option", { name: /Tyler Le/ }).click();
  // The panel opens on the Check-in page (#169); staff don't leave it.
  await expect(page).toHaveURL(/\/desk\?climber=[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Le, Tyler", level: 2 })).toBeVisible();
});
