import fs from "node:fs";
import { expect, test, type Browser } from "@playwright/test";
import { actionId, manifestPath } from "./action-id";
import { signUpDemoCustomer } from "./climber";

// Server actions are public POST endpoints. The proxy only guards /desk and
// /me, but Next.js bundles every export of a "use server" file into each page
// that imports it, so the staff actions in features/climbers/actions.ts can
// also be called through the public /signup page with no login at all.
//
// These tests call staff actions as a logged-out visitor, against a climber
// they create, and expect the action not to run: each action checks the
// caller itself (requireStaff in features/auth/staff.ts). A signed-in
// climber calling them is in real-login.spec.ts.

// Joins as a new climber through /signup and returns their id (the demo
// session cookie holds it).
async function newClimberId(browser: Browser): Promise<string> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const unique = Date.now().toString().slice(-6);
  await signUpDemoCustomer(page, {
    firstName: "Avery",
    lastName: `Probe${unique}`,
    phone: `250556${unique.slice(-4)}`,
    dateOfBirth: "1990-01-01",
  });
  await expect(page.getByRole("link", { name: "Sign waiver" })).toBeVisible();
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
    test(`${name} through /signup`, async ({ browser, playwright, baseURL }) => {
      const climberId = await newClimberId(browser);
      const anonymous = await playwright.request.newContext({ baseURL });
      const response = await anonymous.post("/signup", {
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
