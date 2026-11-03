import { expect, test, type Browser, type Page } from "@playwright/test";
import { openTab } from "./climber";

// The gym calendar on the climber dashboard (#101): the event banner, opening
// hours with busyness, set changes and class sign-up, and the desk's Events
// page where staff keep it. Needs the demo login (DEMO_MODE) and the seeded
// calendar (`npm run db:seed`).

const GYM_TIME_ZONE = "America/Vancouver";

async function logIn(page: Page, username: string, landsOn: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(landsOn);
}

async function phone(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true });
  return { context, page: await context.newPage() };
}

// "2026-11-05T18:00" for a datetime-local field, on the gym's clock.
function gymLocal(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: GYM_TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

test("a climber sees the gym's week, events and set changes on their phone", async ({ browser }) => {
  const { context, page } = await phone(browser);
  await logIn(page, "demo-valid-active", /\/me/);
  const main = page.getByRole("main");

  // The seeded events are coming up, so Home announces the soonest.
  await expect(main.getByTestId("event-banner")).toContainText("Climbing film night");

  // Open or closed now, then seven days of hours with the seeded closed day.
  await expect(main.getByTestId("open-status")).toContainText(/Open now|Closed now/);
  const hours = main.getByRole("list", { name: "Opening hours this week" });
  await expect(hours.getByRole("listitem")).toHaveCount(7);
  await expect(hours.getByRole("listitem").first()).toContainText("Today");
  await expect(hours).toContainText("Staff training day");

  // Busyness by hour is one tap away.
  const toggle = main.getByRole("button", { name: "Show busy times" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(main.getByRole("button", { name: "Hide busy times" })).toHaveAttribute("aria-expanded", "true");
  await expect(main.getByRole("img", { name: /^Usually on Today/ })).toBeVisible();

  await expect(main.getByText("Set changes", { exact: true })).toBeVisible();
  await expect(main).toContainText("New circuit, V0 to V6.");

  // Every event is on the Classes tab, under Events.
  await main.getByRole("link", { name: /See all events/ }).click();
  await expect(page).toHaveURL(/\/me\/classes\?view=events/);
  await expect(main.getByTestId("event-row").filter({ hasText: "Fall Send Fest" })).toBeVisible();
  await expect(main.getByRole("button", { name: "Events" })).toHaveAttribute("aria-pressed", "true");

  // Nothing is wider than the phone.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await context.close();
});

test("a climber signs up for a class and cancels, and a full class can't be joined", async ({ browser }) => {
  const { context, page } = await phone(browser);
  await logIn(page, "demo-valid-none", /\/me/);
  await openTab(page, "Classes");
  const main = page.getByRole("main");

  const full = main.getByTestId("class-row").filter({ hasText: "Technique clinic: footwork" });
  await expect(full).toContainText("Full");
  await expect(full.getByRole("button", { name: "Sign up" })).toBeDisabled();

  const club = main.getByTestId("class-row").filter({ hasText: "Youth climbing club" });
  await expect(club).toContainText("6 spots left");
  await club.getByRole("button", { name: "Sign up" }).click();
  await expect(club).toContainText("You're in");

  // Cancel, so the class is as the seed left it for the next run.
  await club.getByRole("button", { name: "Cancel sign-up" }).click();
  await expect(club.getByRole("button", { name: "Sign up" })).toBeVisible();
  await expect(club).toContainText("6 spots left");
  await context.close();
});

test("the desk announces an event and the climber sees it, until it is canceled", async ({ browser }) => {
  const desk = await browser.newPage();
  await logIn(desk, "desk", /\/desk/);
  await desk.getByRole("navigation").getByRole("link", { name: "Events", exact: true }).click();
  await expect(desk.getByRole("heading", { name: "Hours and events", level: 1 })).toBeVisible();
  const deskMain = desk.getByRole("main");

  // A unique name, in two hours, so it sorts ahead of the seeded events.
  const title = `Pop-up meetup ${Date.now()}`;
  await deskMain.getByRole("button", { name: "Announce event" }).click();
  const form = desk.getByRole("dialog", { name: "Announce an event" });
  await form.getByLabel("Name").fill(title);
  await form.getByLabel("Starts").fill(gymLocal(new Date(Date.now() + 2 * 60 * 60 * 1000)));
  await form.getByRole("button", { name: "Announce" }).click();
  await expect(form).toBeHidden();
  await expect(deskMain.getByRole("list", { name: "Events" })).toContainText(title);

  const { context, page } = await phone(desk.context().browser()!);
  await logIn(page, "demo-valid-active", /\/me/);
  await expect(page.getByRole("main").getByTestId("event-banner").filter({ hasText: title })).toBeVisible();

  await deskMain.getByRole("button", { name: `Cancel event: ${title}` }).click();
  const confirm = desk.getByRole("dialog", { name: "Cancel event" });
  await confirm.getByRole("button", { name: "Cancel event" }).click();
  await expect(confirm).toBeHidden();

  await expect(deskMain.getByRole("listitem").filter({ hasText: title })).toContainText("Canceled");

  // No longer announced as on. (Whether it shows as canceled depends on how
  // many events are on; the database tests cover that.)
  await page.reload();
  const banners = page.getByRole("main").getByTestId("event-banner");
  await expect(banners.first()).toBeVisible();
  await expect(banners.filter({ hasText: title }).filter({ hasNotText: "Canceled" })).toHaveCount(0);
  await context.close();
  await desk.close();
});

test("the desk's hours form shows the regular week", async ({ page }) => {
  await logIn(page, "desk", /\/desk/);
  await page.goto("/desk/events");
  // Inside <main>: while the page streams in, a second copy can briefly sit outside it.
  const main = page.getByRole("main");
  await expect(main.getByLabel("Mon opens")).toHaveValue("06:00");
  await expect(main.getByLabel("Sun closes")).toHaveValue("18:00");
  await expect(main.getByRole("list", { name: "Special days" })).toContainText("Staff training day");
});
