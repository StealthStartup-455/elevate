import { expect, test, type Page } from "@playwright/test";
import { signWaiverForm } from "./sign-waiver";

// The climber panel on the Check-in page (#169). At Playwright's default width
// (1280px) it opens beside the table, as an <aside>. Needs the demo login and
// the seed: Zack Zhao (expired waiver, member), Maya Patel (valid waiver, no
// pass) and Scott Squires (valid waiver, member).

async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("desk");
  await page.getByLabel("Password").fill("desk");
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/desk/);
}

// Inside <main>: while the page streams in, a second copy can briefly sit
// outside it.
const main = (page: Page) => page.getByRole("main");
const table = (page: Page) => main(page).getByRole("table", { name: /check-ins? (today|on )/ });
const panel = (page: Page) => page.getByRole("complementary");

async function find(page: Page, name: string) {
  await page.getByRole("combobox", { name: "Find climber" }).fill(name);
  await page.getByRole("option", { name: new RegExp(name) }).click();
  const [first, last] = name.split(" ");
  await expect(panel(page).getByRole("heading", { name: `${last}, ${first}` })).toBeVisible();
}

test("a name in the table opens the panel beside it; ✕, Esc and Back close it", async ({ page }) => {
  await logIn(page);
  const link = table(page).getByRole("link").first();
  await link.click();
  await expect(panel(page)).toBeVisible();
  await expect(page).toHaveURL(/\/desk\?climber=[0-9a-f-]+$/);
  // The table stays usable next to it, with the open climber's row marked.
  await expect(table(page).locator("tr.Mui-selected").first()).toBeVisible();

  await panel(page).getByRole("button", { name: "Close" }).click();
  await expect(panel(page)).toBeHidden();
  await expect(page).toHaveURL(/\/desk$/);

  await link.click();
  await expect(panel(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
  // Focus goes back to the name that opened it.
  await expect(link).toBeFocused();

  await link.click();
  await expect(panel(page)).toBeVisible();
  await page.goBack();
  await expect(panel(page)).toBeHidden();
  await expect(page).toHaveURL(/\/desk$/);
});

test("Find climber opens the panel and keeps the page in the URL", async ({ page }) => {
  await logIn(page);
  await page.goto("/desk?page=1");
  await find(page, "Maya Patel");
  await expect(page).toHaveURL(/\/desk\?page=1&climber=[0-9a-f-]+$/);
});

test("an expired waiver: the problem, a link to the real waiver form, and Check in disabled", async ({ page }) => {
  await logIn(page);
  await find(page, "Zack Zhao");
  const side = panel(page);
  await expect(side.getByText("Can't check in yet")).toBeVisible();
  await expect(side.getByText("Waiver expired.")).toBeVisible();
  await expect(side.getByRole("button", { name: "Check in" })).toBeDisabled();

  // The fix opens the real waiver form for them; it never marks one signed in a click (#131).
  await side.getByRole("link", { name: "Sign waiver" }).click();
  await expect(page).toHaveURL(/\/desk\/customers\/[0-9a-f-]+\/waiver$/);
  await expect(page.getByRole("checkbox", { name: /^I (?!agree)/ }).first()).toBeVisible();
});

test("no pass: POS opens the POS with them picked, shown once", async ({ page }) => {
  await logIn(page);
  await find(page, "Maya Patel");
  const sell = panel(page).getByRole("link", { name: "POS", exact: true });
  await expect(sell).toHaveCount(1);
  await sell.click();
  await expect(page).toHaveURL(/\/desk\/pos\?climber=[0-9a-f-]+$/);
});

test("a new climber: sign the real waiver form from the panel, then only the pass is left", async ({ page }) => {
  await logIn(page);
  const unique = Date.now().toString().slice(-6);
  await page.goto("/desk/customers/new");
  await expect(page.locator('input[name="dateOfBirth"]')).toHaveCount(1);
  await page.getByRole("textbox", { name: "First name" }).fill("Panel");
  await page.getByRole("textbox", { name: "Last name" }).fill(`Test${unique}`);
  await page.getByRole("textbox", { name: "Phone number" }).fill(`250557${unique.slice(-4)}`);
  await page.getByLabel("Date of birth").fill("1990-02-02");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/desk\/customers\/[0-9a-f-]+\?added=1/);

  await page.goto("/desk");
  await find(page, `Panel Test${unique}`);
  const side = panel(page);
  // Two problems: numbered, the waiver first.
  await expect(side.getByRole("listitem")).toHaveCount(2);
  await side.getByRole("link", { name: "Sign waiver" }).click();
  await expect(page).toHaveURL(/\/desk\/customers\/[0-9a-f-]+\/waiver$/);
  await signWaiverForm(page);
  await expect(page.getByText("Waiver signed")).toBeVisible();
  await page.goto("/desk");
  await find(page, `Panel Test${unique}`);
  await expect(side.getByRole("link", { name: "Sign waiver" })).toBeHidden();
  await expect(side.getByText(/no day pass or punch card/)).toBeVisible();
  await expect(side.getByRole("link", { name: "POS", exact: true })).toBeVisible();
});

test("Check in from the panel shows the check-in and adds them to the table", async ({ page }) => {
  await logIn(page);
  await find(page, "Scott Squires");
  const side = panel(page);
  // Checked in within the last two hours by an earlier run: nothing to press.
  const checkIn = side.getByRole("button", { name: "Check in" });
  if (await checkIn.isVisible()) await checkIn.click();
  await expect(side.getByText(/^Checked in at \d{1,2}:\d{2}/)).toBeVisible();
  await expect(side.getByRole("button", { name: "Check in" })).toBeHidden();
  await expect(table(page).getByRole("link", { name: "Scott Squires" }).first()).toBeVisible();
});

test("Esc doesn't close the panel while editing details", async ({ page }) => {
  await logIn(page);
  await find(page, "Maya Patel");
  const side = panel(page);
  await side.getByRole("tab", { name: "Details" }).click();
  await side.getByRole("button", { name: "Edit" }).click();
  await side.getByLabel(/first name/i).fill("Maya edited");
  await page.keyboard.press("Escape");
  await expect(side).toBeVisible();
  await expect(side.getByLabel(/first name/i)).toHaveValue("Maya edited");

  // Cancel leaves the form, and then Esc closes the panel again.
  await side.getByRole("button", { name: "Cancel" }).click();
  await page.keyboard.press("Escape");
  await expect(side).toBeHidden();
});
