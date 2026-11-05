import { expect, test } from "@playwright/test";

// The desk's Waivers page and editor (#110). The e2e suite shares one seeded
// gym, so this never publishes: a new version would make every seeded climber
// sign again and break the tests after it. Publishing itself is covered by
// src/features/waivers/actions.db.test.ts.

test("the desk sees the current waiver and the editor refuses an unconfirmed or unchanged publish", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("desk");
  await page.getByLabel("Password").fill("desk");
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/desk/);

  await page.getByRole("navigation").getByRole("link", { name: "Waivers", exact: true }).click();
  await expect(page).toHaveURL(/\/desk\/waivers$/);
  // Scoped to <main>: while a page streams in, a second copy can sit outside it.
  const main = page.getByRole("main");
  await expect(main.getByText(/Version v1 · published/)).toBeVisible();
  await expect(main.getByRole("row", { name: /v1/ }).getByText("Current")).toBeVisible();

  await main.getByRole("link", { name: "Edit the wording" }).click();
  await expect(page).toHaveURL(/\/desk\/waivers\/edit$/);
  const title = main.getByRole("textbox", { name: "Title" });
  const publish = main.getByRole("button", { name: "Publish v2" });
  await expect(title).toHaveValue("Sample climbing waiver");
  await expect(publish).toBeVisible();

  // Not confirmed: nothing is published.
  await publish.click();
  await expect(main.getByText("Tick the box to confirm every climber will sign again.")).toBeVisible();

  // Confirmed but unchanged: still nothing.
  await main.getByLabel("I understand every climber will have to sign again.").check();
  await publish.click();
  await expect(main.getByText(/Nothing changed/)).toBeVisible();
  // What was typed is kept after an error.
  await expect(title).toHaveValue("Sample climbing waiver");
});
