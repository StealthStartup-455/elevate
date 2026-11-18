import { expect, type Page } from "@playwright/test";

// The desk's arrival toasts and Arrivals list (#225).

/** The top-right toast for this climber. */
export function arrivalToast(desk: Page, name: string) {
  return desk.getByRole("status").filter({ hasText: name });
}

/** Clears this climber's arrival from the Arrivals list, so it doesn't reach later tests. */
export async function clearArrival(desk: Page, name: string) {
  await desk.getByRole("button", { name: /^Arrivals/ }).click();
  const row = desk.getByRole("list", { name: "Waiting arrivals" }).getByRole("listitem").filter({ hasText: name });
  await row.getByRole("button", { name: "Clear" }).click();
  await expect(row).toHaveCount(0);
  // Closes itself when the list empties; otherwise Escape closes it.
  const list = desk.getByRole("list", { name: "Waiting arrivals" });
  if ((await list.count()) > 0) await desk.keyboard.press("Escape");
  await expect(list).toHaveCount(0);
}

/** Opens this climber's check-in panel from their toast. */
export async function openArrival(desk: Page, name: string) {
  await arrivalToast(desk, name).getByRole("button", { name: "Open check-in" }).click();
  await expect(desk).toHaveURL(/\/desk\?climber=/);
  // Other arrivals' toasts can sit over the panel: dismiss them, as staff would.
  const dismiss = desk.getByRole("status").getByRole("button", { name: /^Dismiss/ });
  while ((await dismiss.count()) > 0) await dismiss.first().click();
  // The panel writes names "Last, First".
  const panel = desk.locator('[aria-labelledby="climber-panel-title"]');
  await expect(panel).toBeVisible();
  return panel;
}

/** This climber is no longer waiting in the Arrivals list (checked in or cleared). */
export async function expectNotWaiting(desk: Page, name: string) {
  await desk.waitForTimeout(6_000); // two polls, so the list is up to date
  const button = desk.getByRole("button", { name: /^Arrivals/ });
  if ((await button.count()) === 0) return;
  await button.click();
  const list = desk.getByRole("list", { name: "Waiting arrivals" });
  await expect(list.getByRole("listitem").filter({ hasText: name })).toHaveCount(0);
  await desk.keyboard.press("Escape");
  await expect(list).toHaveCount(0);
}
