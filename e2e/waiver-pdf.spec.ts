import { readFile } from "node:fs/promises";
import { expect, test, type Browser, type Download, type Page } from "@playwright/test";
import { signUpDemoCustomer } from "./climber";
import { signWaiverForm } from "./sign-waiver";

// Download a signed waiver as a PDF (#111): the climber from their waiver page,
// and the desk from /desk/waivers/[id]. Another climber gets a 404, and anyone
// logged out is sent to log in.

async function newPage(browser: Browser, phone = false): Promise<Page> {
  const context = await browser.newContext(
    phone ? { viewport: { width: 390, height: 844 }, isMobile: true } : {},
  );
  return context.newPage();
}

async function expectPdf(download: Download) {
  expect(download.suggestedFilename()).toMatch(/^waiver-morgan-pdf\d+-\d{4}-\d{2}-\d{2}\.pdf$/);
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
}

test.afterEach(async ({ browser }) => {
  for (const context of browser.contexts()) await context.close();
});

test("the climber and the desk download a signed waiver as a PDF", async ({ browser }) => {
  const phone = await newPage(browser, true);
  const unique = Date.now().toString().slice(-6);
  await signUpDemoCustomer(phone, {
    firstName: "Morgan",
    lastName: `Pdf${unique}`,
    phone: `250557${unique.slice(-4)}`,
    dateOfBirth: "1990-05-05",
  });
  await phone.getByRole("link", { name: "Sign waiver" }).click();
  await signWaiverForm(phone);
  await phone.getByRole("link", { name: "View your waiver" }).click();
  await expect(phone).toHaveURL(/\/me\/waiver\/[0-9a-f-]+$/);
  const waiverId = phone.url().split("/").pop()!;

  const [mine] = await Promise.all([
    phone.waitForEvent("download"),
    phone.getByRole("link", { name: "Download PDF" }).click(),
  ]);
  await expectPdf(mine);

  const desk = await newPage(browser);
  await desk.goto("/login");
  await desk.getByLabel("Email").fill("desk");
  await desk.getByLabel("Password").fill("desk");
  await desk.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(desk).toHaveURL(/\/desk/);
  await desk.goto(`/desk/waivers/${waiverId}`);
  // Scoped to <main>: while the page streams in, a second copy can sit outside it.
  await expect(desk.getByRole("main").getByText(`Signed for Morgan Pdf${unique}`)).toBeVisible();
  const [theirs] = await Promise.all([
    desk.waitForEvent("download"),
    desk.getByRole("link", { name: "Download PDF" }).click(),
  ]);
  await expectPdf(theirs);

  // A different logged-in climber can't download it: a waiver is a legal
  // record, so another climber gets a 404, not the PDF.
  const other = await newPage(browser, true);
  await signUpDemoCustomer(other, {
    firstName: "Avery",
    lastName: `Other${unique}`,
    phone: `250558${unique.slice(-4)}`,
    dateOfBirth: "1991-06-06",
  });
  await expect(other.getByRole("link", { name: "Sign waiver" })).toBeVisible();
  const refused = await other.request.get(`/me/waiver/${waiverId}/pdf`, { maxRedirects: 0 });
  expect(refused.status()).toBe(404);
  expect(refused.headers()["content-type"]).not.toContain("application/pdf");

  // Logged out, the PDF address sends you to log in instead of downloading.
  const stranger = await newPage(browser);
  await stranger.goto(`/desk/waivers/${waiverId}/pdf`);
  await expect(stranger).toHaveURL(/\/login/);
});
