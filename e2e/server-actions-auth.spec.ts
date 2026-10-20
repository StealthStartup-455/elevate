import fs from "node:fs";
import path from "node:path";
import { expect, test, type Browser } from "@playwright/test";

// Server actions are public POST endpoints. The proxy only guards /desk and
// /me, but Next.js bundles every export of a "use server" file into each page
// that imports it, so the staff actions in features/climbers/actions.ts can
// also be called through the public /join page with no login at all.
//
// These tests call staff actions as a logged-out visitor, against a climber
// they create, and expect the action not to run. They fail today: the actions
// have no permission check of their own (the TODO(auth) comments). Marked
// test.fail so CI stays green and goes red the day the checks land, as a
// reminder to remove the marker (#34).

const manifestPath = path.join(process.cwd(), ".next/server/server-reference-manifest.json");

function actionId(name: string): string {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    node: Record<string, { exportedName?: string }>;
  };
  const entry = Object.entries(manifest.node).find(([, v]) => v.exportedName === name);
  if (!entry) throw new Error(`No server action named ${name} in the build`);
  return entry[0];
}

// Joins as a new climber through /join and returns their id (the demo
// session cookie holds it).
async function newClimberId(browser: Browser): Promise<string> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const unique = Date.now().toString().slice(-6);
  await page.goto("/join");
  await page.getByLabel("First name").fill("Avery");
  await page.getByLabel("Last name").fill(`Probe${unique}`);
  await page.getByLabel("Phone number").fill(`250556${unique.slice(-4)}`);
  await page.getByLabel("Date of birth").fill("1990-01-01");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("button", { name: /sign a waiver/i })).toBeVisible();
  const cookie = (await context.cookies()).find((c) => c.name === "elevate_mock_user");
  await context.close();
  if (!cookie) throw new Error("Joining did not start a demo session");
  return cookie.value;
}

// Text that only appears when the action ran: a success, or one of the
// check-in rules (which come after any permission check would be).
const RAN = /"ok":true|Waiver is not valid|No active membership|Already checked in/;

test.describe("staff actions refuse logged-out callers", () => {
  test.skip(
    !!process.env.E2E_BASE_URL || !fs.existsSync(manifestPath),
    "Needs the local build's action ids",
  );

  for (const name of ["checkInClimber", "signWaiver"]) {
    test(`${name} through /join`, async ({ browser, playwright, baseURL }) => {
      test.fail(true, "No permission check in server actions yet (#34)");
      const climberId = await newClimberId(browser);
      const anonymous = await playwright.request.newContext({ baseURL });
      const response = await anonymous.post("/join", {
        headers: {
          "Next-Action": actionId(name),
          "Content-Type": "text/plain;charset=UTF-8",
          Accept: "text/x-component",
        },
        data: JSON.stringify([climberId]),
      });
      expect(await response.text()).not.toMatch(RAN);
      await anonymous.dispose();
    });
  }
});
