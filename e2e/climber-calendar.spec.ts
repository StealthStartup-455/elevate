import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openTab } from "./climber";

// The Calendar view on the Classes tab (#101): a day with a class shows it underneath, tapping
// it opens a sheet that signs up and cancels like the Classes list, and the choice of view
// stays in the URL. Needs the demo login (DEMO_MODE) and the seeded calendar.

test("a climber finds a class on the calendar and signs up from its sheet", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true });
  const page = await context.newPage();

  // A new climber, so no class is booked yet and the seed's bookings stay as they are.
  const unique = Date.now().toString().slice(-6);
  await page.goto("/join");
  await page.getByLabel("First name").fill("Casey");
  await page.getByLabel("Last name").fill(`Cal${unique}`);
  await page.getByLabel("Phone number").fill(`250559${unique.slice(-4)}`);
  await page.getByLabel("Date of birth").fill("1992-07-07");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("link", { name: "Sign the waiver" })).toBeVisible();

  // Joining leaves them on /join, logged in; the tab bar is on their dashboard.
  await page.goto("/me");
  await openTab(page, "Classes");
  await page.getByRole("button", { name: "Calendar" }).click();
  await expect(page).toHaveURL(/view=calendar/);
  const calendar = page.getByTestId("calendar");
  await expect(calendar.getByRole("button", { pressed: true })).toHaveAttribute("aria-current", "date");

  // The seed puts classes over the next two weeks: pick the first day with one.
  const dayWithClass = calendar.getByRole("button", { name: /\d+ class/ }).first();
  const label = (await dayWithClass.getAttribute("aria-label"))!;
  await dayWithClass.click();
  await expect(dayWithClass).toHaveAttribute("aria-pressed", "true");
  const day = page.getByTestId("calendar-day");
  await expect(day.getByRole("heading", { level: 2 })).toHaveText(label.split(":")[0]);

  await day.getByRole("list").getByRole("button").last().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual([]);

  await sheet.getByRole("button", { name: "Sign up" }).click();
  await expect(sheet.getByText("You're in")).toBeVisible();
  await sheet.getByRole("button", { name: /Cancel sign-up/ }).click();
  await expect(sheet.getByRole("button", { name: "Sign up" })).toBeVisible();
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toBeHidden();

  // A reload keeps the calendar open.
  await page.reload();
  await expect(page.getByTestId("calendar")).toBeVisible();
  await context.close();
});
