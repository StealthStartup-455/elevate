import type { Page } from "@playwright/test";

// Draws a short squiggle on the signature pad with the mouse.
export async function drawSignature(page: Page) {
  const pad = page.getByRole("img", { name: /sign in the box/i });
  await pad.scrollIntoViewIfNeeded();
  const box = await pad.boundingBox();
  if (!box) throw new Error("No signature box");
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(box.x + 20 + i * 12, box.y + box.height / 2 + Math.sin(i / 2) * 25);
  }
  await page.mouse.up();
}

// Fills in and submits the adult form on /me/waiver: every rule, an emergency
// contact, a drawn signature and the e-signature box.
export async function signWaiverForm(page: Page) {
  const rules = page.getByRole("checkbox", { name: /^I (?!agree)/ });
  // all() doesn't wait, so wait for the form before collecting the rules.
  await rules.first().waitFor();
  for (const box of await rules.all()) {
    await box.check();
  }
  await page.getByRole("textbox", { name: /^Name/ }).fill("Jordan Test");
  await page.getByRole("textbox", { name: /^Phone number/ }).fill("250 555 0199");
  await drawSignature(page);
  await page.getByLabel(/electronic signature/i).check();
  await page.getByRole("button", { name: "Sign waiver" }).click();
}
