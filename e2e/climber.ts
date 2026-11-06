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
