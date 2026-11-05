import { expect, type Page } from "@playwright/test";

// Helpers for the climber app's tabs (#101). The QR code and "Simulate scan" are on the Check
// in tab, so a scan opens it first, through the tab bar like a climber would.

export async function openTab(page: Page, name: "Home" | "Check in" | "Membership" | "Classes") {
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name, exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
}

export async function pressScan(phone: Page) {
  if (!new URL(phone.url()).pathname.startsWith("/me/check-in")) await openTab(phone, "Check in");
  await phone.getByRole("button", { name: "Simulate scan" }).click();
}

export async function signUpDemoCustomer(
  page: Page,
  {
    firstName,
    lastName,
    phone,
    dateOfBirth,
  }: { firstName: string; lastName: string; phone: string; dateOfBirth: string },
) {
  await page.goto("/signup");
  await page.getByLabel("First name").fill(firstName);
  await page.getByLabel("Last name").fill(lastName);
  await page.getByLabel("Phone number").fill(phone);
  await page.getByLabel("Email").fill(`${firstName}.${lastName}@elevate.test`);
  await page.getByLabel("Date of birth").fill(dateOfBirth);
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/me\/explore$/);
  await page.getByRole("button", { name: "Elevate Demo Gym" }).click();
  await expect(page).toHaveURL(/\/me\/register$/);
}
