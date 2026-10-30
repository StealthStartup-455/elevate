import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { actionId } from "./action-id";

// The real Supabase logins the seed makes (prisma/seed-logins.ts), unlike
// smoke.spec.ts, which uses the demo cookie. Skipped without
// SEED_LOGIN_PASSWORD, so CI (a placeholder Supabase) skips it. Locally: set
// SUPABASE_SECRET_KEY and SEED_LOGIN_PASSWORD in .env, then `npm run db:seed`.
const password = process.env.SEED_LOGIN_PASSWORD;

async function logIn(page: Page, email: string, landsOn: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(landsOn);
}

test.describe("real logins", () => {
  test.skip(!password, "Needs SEED_LOGIN_PASSWORD and the seeded logins");

  test("a climber's login can't open the front desk", async ({ page }) => {
    await logIn(page, "climber@elevate.test", /\/me/);
    await page.goto("/desk");
    await expect(page).toHaveURL(/\/staff-only/);
    await page.goto("/desk/climbers");
    await expect(page).toHaveURL(/\/staff-only/);
  });

  test("a climber's login can't call a staff action", async ({ page }) => {
    test.skip(!!process.env.E2E_BASE_URL, "Needs the local build's action ids");
    await logIn(page, "climber@elevate.test", /\/me/);
    // page.request sends the climber's login cookies. Any well-formed id: if
    // the action ran at all, it answers "Climber not found".
    const response = await page.request.post("/join", {
      headers: {
        "Next-Action": actionId("checkInClimber"),
        "Content-Type": "text/plain;charset=UTF-8",
        Accept: "text/x-component",
      },
      data: JSON.stringify(["00000000-0000-4000-8000-000000000000"]),
    });
    expect(await response.text()).not.toMatch(/Climber not found|"ok":/);
  });

  test("the desk login opens the front desk, and /me sends it back", async ({ page }) => {
    await logIn(page, "desk@elevate.test", /\/desk/);
    await page.goto("/desk/climbers");
    await expect(page.getByRole("heading", { name: "Climbers", level: 1 })).toBeVisible();
    await page.goto("/me");
    await expect(page).toHaveURL(/\/desk$/);
  });
});
