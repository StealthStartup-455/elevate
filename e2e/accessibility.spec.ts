import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Automated WCAG 2.1 A and AA checks (axe-core) on every main screen, in
// light and dark mode. Axe finds roughly a third of accessibility problems
// (contrast, labels, roles, names); keyboard and screen reader checks are
// still done by hand. Needs DEMO_MODE and seeded data, like smoke.spec.ts.

const screens: { user?: string; paths: string[]; phone: boolean }[] = [
  { paths: ["/login", "/join"], phone: true },
  { user: "demo-valid-active", paths: ["/me", "/me/stats", "/me/events", "/me/membership", "/staff-only"], phone: true },
  {
    user: "desk",
    paths: ["/desk", "/desk/pos", "/desk/climbers", "/desk/climbers/new", "/desk/waivers"],
    phone: false,
  },
];

async function logIn(page: Page, username: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(username);
  await page.getByLabel("Password").fill(username);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

for (const colorScheme of ["light", "dark"] as const) {
  for (const { user, paths, phone } of screens) {
    test(`${user ?? "logged out"} screens pass axe in ${colorScheme} mode`, async ({ browser }) => {
      const context = await browser.newContext({
        colorScheme,
        ...(phone ? { viewport: { width: 390, height: 844 }, isMobile: true } : {}),
      });
      const page = await context.newPage();
      if (user) await logIn(page, user);
      for (const path of paths) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        const summary = violations.map(
          (v) => `${path}: ${v.id} (${v.impact}) on ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
        );
        expect(summary, summary.join("\n")).toEqual([]);
      }
      await context.close();
    });
  }
}
