import { expect, test } from "@playwright/test";

// Every page shows the build's version, and /api/version reports the same one
// (#43). The Deploy staging workflow relies on /api/version to confirm a
// deploy is live.
test("the footer and /api/version show the same version", async ({ page, request }) => {
  const response = await request.get("/api/version");
  expect(response.ok()).toBe(true);
  const info = await response.json();
  expect(info.version).toMatch(/^v\d+\.\d+\.\d+(-dev\.\d+)?\+[0-9a-z.]+$/);

  await page.goto("/login");
  await expect(page.getByTestId("app-version")).toHaveText(info.version);
});
