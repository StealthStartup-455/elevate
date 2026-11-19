import { expect, test, type Browser, type Page } from "@playwright/test";
import { pressScan, signUpDemoCustomer } from "./climber";
import { arrivalToast, expectNotWaiting, openArrival } from "./desk-arrivals";
import { signWaiverForm } from "./sign-waiver";

// A scan with a problem (#90): the phone says the desk will help, and the
// desk's arrival toast (#225) names each problem and the next step, until the
// climber can check in.

async function newPage(browser: Browser, phone = false): Promise<Page> {
  const context = await browser.newContext(
    phone ? { viewport: { width: 390, height: 844 }, isMobile: true } : {},
  );
  return context.newPage();
}

test("a new climber with no waiver or membership scans in, and the desk fixes both", async ({
  browser,
}) => {
  const desk = await newPage(browser);
  await desk.goto("/login");
  await desk.getByLabel("Email").fill("desk");
  await desk.getByLabel("Password").fill("desk");
  await desk.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(desk).toHaveURL(/\/desk/);

  // Join without signing the waiver: no waiver, no membership.
  const phone = await newPage(browser, true);
  const unique = Date.now().toString().slice(-6);
  await signUpDemoCustomer(phone, {
    firstName: "Jesse",
    lastName: `Scan${unique}`,
    phone: `250558${unique.slice(-4)}`,
    dateOfBirth: "1994-06-06",
  });
  await expect(phone.getByRole("link", { name: "Sign waiver" })).toBeVisible();
  await phone.goto("/me");

  await pressScan(phone);
  const phoneDialog = phone.getByRole("dialog");
  await expect(phoneDialog).toContainText("Sent to the desk", { timeout: 10_000 });
  await expect(phoneDialog).toContainText("They'll help you sign a waiver.");
  await expect(phoneDialog).toContainText("They'll help you with a day pass or membership.");

  const name = `Jesse Scan${unique}`;
  const toast = arrivalToast(desk, name);
  await expect(toast).toContainText("Can't check in yet", { timeout: 20_000 });
  await expect(toast).toContainText("No waiver signed");
  await expect(toast).toContainText("No membership, day pass or punch card");
  await expect(toast).toContainText("Next: sign the waiver with them, then give a day pass.");

  // Open check-in, then Sign waiver opens the real waiver form for them (#210).
  const panel = await openArrival(desk, name);
  await panel.getByRole("link", { name: "Sign waiver" }).click();
  await expect(desk).toHaveURL(/\/desk\/customers\/[0-9a-f-]+\/waiver$/);
  await signWaiverForm(desk);
  await expect(desk.getByText("Waiver signed", { exact: true })).toBeVisible();

  // They scan again (the first sent-to-desk message is still open), and now only the pass is left.
  await phone.goto("/me/check-in");
  await pressScan(phone);
  await expect(toast).toContainText("Next: give a day pass, or sell a membership.", { timeout: 20_000 });
  await expect(toast).not.toContainText("No waiver signed");

  // The free day pass stopgap (#62) is in Manual check in, on the Check-in page.
  await desk.goto("/desk");
  await desk.getByRole("button", { name: /manual check in/i }).click();
  const dialog = desk.getByRole("dialog");
  await dialog.getByLabel("Search name or phone").fill(name);
  await dialog.getByRole("list", { name: "Matching climbers" }).getByText(name).click();
  await dialog.getByRole("button", { name: "Give free day pass" }).click();
  await dialog.getByRole("button", { name: "Manually check in" }).click();
  await expect(dialog).toContainText("is checked in");
  await dialog.getByRole("button", { name: "Done" }).click();
  await expectNotWaiting(desk, name);
});
