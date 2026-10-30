import { expect, test, type Browser, type Page } from "@playwright/test";

// A scan with a problem (#90): the phone says the desk will help, and the
// desk popup offers each fix in turn until the climber can check in.

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
  await phone.goto("/join");
  await phone.getByLabel("First name").fill("Jesse");
  await phone.getByLabel("Last name").fill(`Scan${unique}`);
  await phone.getByLabel("Phone number").fill(`250558${unique.slice(-4)}`);
  await phone.getByLabel("Date of birth").fill("1994-06-06");
  await phone.getByRole("button", { name: "Create account" }).click();
  await expect(phone.getByRole("link", { name: "Sign the waiver" })).toBeVisible();
  await phone.goto("/me");

  await phone.getByRole("button", { name: /scan/i }).click();
  const phoneDialog = phone.getByRole("dialog");
  await expect(phoneDialog).toContainText("Sent to the desk", { timeout: 10_000 });
  await expect(phoneDialog).toContainText("They'll help you sign a waiver.");
  await expect(phoneDialog).toContainText("They'll help you with a day pass or membership.");

  const popup = desk.getByRole("dialog");
  await expect(popup).toContainText(`Jesse Scan${unique}`, { timeout: 20_000 });
  await expect(popup).toContainText("Next: sign the waiver with them, then give a day pass.");

  await popup.getByRole("button", { name: "Sign waiver" }).click();
  await expect(popup).toContainText("Next: give a day pass, or sell a membership.");
  await popup.getByRole("button", { name: "Give free day pass" }).click();
  await popup.getByRole("button", { name: "Check in" }).click();
  await expect(popup).toContainText("is checked in");
});
