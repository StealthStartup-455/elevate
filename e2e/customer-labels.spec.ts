import { expect, test, type Locator, type Page } from "@playwright/test";

// Customer labels (#157): staff add a label on the Check-in climber panel, and
// it shows wherever staff see that customer: the panel, their page under
// Customers, and their row in today's check-ins. Taking it off removes it
// everywhere. Needs the demo login and the seed: Scott Squires has a valid
// waiver and a membership, so he can be checked in.
//
// The label's name is new each run, so a rerun never meets an old one.

const CLIMBER = "Scott Squires";

async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("desk");
  await page.getByLabel("Password").fill("desk");
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/desk/);
}

// Inside <main>: while the page streams in, a second copy can briefly sit outside it.
const main = (page: Page) => page.getByRole("main");
const table = (page: Page) => main(page).getByRole("table", { name: /check-ins? (today|on )/ });
const panel = (page: Page) => page.getByRole("complementary");

async function openPanel(page: Page) {
  await page.getByRole("combobox", { name: "Find climber" }).fill(CLIMBER);
  await page.getByRole("option", { name: new RegExp(CLIMBER) }).click();
  await expect(panel(page).getByRole("heading", { name: "Squires, Scott", exact: true })).toBeVisible();
}

test("a label added on the panel shows on the panel, the customer page and the check-in row, and goes when taken off", async ({
  page,
}) => {
  const name = `E2E label ${Date.now()}`;
  const remove = (scope: Locator) =>
    scope.getByRole("button", { name: `Remove label ${name}`, exact: true });
  await logIn(page);
  await openPanel(page);
  const side = panel(page);
  const climberId = new URL(page.url()).searchParams.get("climber");
  expect(climberId).toMatch(/^[0-9a-f-]{36}$/);

  // Made from what was typed, and on the panel at once.
  await side.getByRole("button", { name: "Add label", exact: true }).click();
  await side.getByRole("combobox", { name: "Add label", exact: true }).fill(name);
  await page.getByRole("option", { name: `Create "${name}"`, exact: true }).click();
  await expect(remove(side)).toBeVisible();

  // Saved: still there after a reload.
  await page.reload();
  await expect(remove(side)).toBeVisible();

  // Checked in within the last two hours by an earlier run: nothing to press.
  const checkIn = side.getByRole("button", { name: "Check in", exact: true });
  if (await checkIn.isVisible()) await checkIn.click();
  await expect(side.getByText(/^Checked in at \d{1,2}:\d{2}/)).toBeVisible();

  // On his row in today's table, beside his name. A row shows two labels and
  // "+N more"; the list's text has every name, so this holds either way.
  const row = table(page)
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name: CLIMBER, exact: true }) })
    .first();
  await expect(row.getByRole("list", { name: "Labels", exact: true })).toContainText(name);

  // On his page under Customers, then taken off there.
  await page.goto(`/desk/customers/${climberId}`);
  const labels = main(page).getByRole("region", { name: "Labels", exact: true });
  await expect(labels.getByText(name, { exact: true })).toBeVisible();
  await remove(labels).click();
  await expect(remove(labels)).toBeHidden();

  // Gone everywhere after a reload: his page, the panel and his row.
  await page.reload();
  await expect(main(page).getByRole("region", { name: "Labels", exact: true })).toBeVisible();
  await expect(main(page).getByText(name, { exact: true })).toHaveCount(0);
  await page.goto(`/desk?climber=${climberId}`);
  await expect(panel(page).getByRole("heading", { name: "Squires, Scott", exact: true })).toBeVisible();
  await expect(remove(panel(page))).toHaveCount(0);
  await expect(row).toBeVisible();
  await expect(row).not.toContainText(name);
});
