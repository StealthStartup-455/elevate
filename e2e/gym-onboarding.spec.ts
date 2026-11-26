import { expect as baseExpect, test, type Page } from "@playwright/test";
import { signUpDemoCustomer } from "./climber";
import { signWaiverForm } from "./sign-waiver";

test.use({ actionTimeout: 15_000 });
const expect = baseExpect.configure({ timeout: 15_000 });

async function screenshots(page: Page, name: string) {
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.waitForLoadState("networkidle");
    const path = test.info().outputPath(`${name}-${colorScheme}.png`);
    await page.screenshot({ path, fullPage: true });
    await test.info().attach(`${name}-${colorScheme}`, { path, contentType: "image/png" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
}

test("signup identifies invalid fields and keeps non-secret profile values", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("First name").fill("Alex");
  await page.getByLabel("Last name").fill("Climber");
  await page.getByLabel("Phone number").fill("12");
  await page.getByLabel("Email").fill("invalid");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter a valid phone number, including area code.")).toBeVisible();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Enter a date of birth.")).toBeVisible();
  await expect(page.getByText("Enter a password.")).toBeVisible();
  await expect(page.getByLabel("First name")).toHaveValue("Alex");
});

test("a new gym owner and multi-gym customer can publish, sign and download their own gym's waiver", async ({ browser }) => {
  test.setTimeout(180_000);
  const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const customerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const owner = await ownerContext.newPage();
  const customer = await customerContext.newPage();
  const unique = Date.now();
  const gymName = `Onboarding Gym ${unique}`;
  const email = `gym-${unique}@example.test`;
  try {
    await owner.goto("/login");
    await screenshots(owner, "login");
    await owner.goto("/gym/signup");
    await screenshots(owner, "gym-signup");
    await owner.getByLabel("Gym name").fill(gymName);
    await owner.getByLabel("Your name").fill("Gym Owner");
    await owner.getByLabel("Email").fill(email);
    await owner.getByLabel("Password").fill("owner-password");
    await owner.getByRole("button", { name: "Create gym", exact: true }).click();
    await expect(owner).toHaveURL(/\/desk$/);
    await owner.getByRole("button", { name: "Log out" }).click();
    await owner.goto("/login");
    await owner.getByLabel("Email").fill(email);
    await owner.getByLabel("Password").fill("owner-password");
    await owner.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(owner).toHaveURL(/\/desk$/);

    await owner.goto("/desk/waivers/edit");
    await owner.getByRole("textbox", { name: "Title", exact: true }).fill("Our new gym waiver");
    await owner.getByRole("textbox", { name: "Text", exact: true }).fill("Only this new gym's waiver wording.");
    await owner.getByRole("textbox", { name: "Rules", exact: true }).fill("I understand this gym's rules.");
    await owner.getByRole("checkbox", { name: "I understand every climber will have to sign again.", exact: true }).check();
    await owner.getByRole("button", { name: "Publish v1", exact: true }).click();
    await expect(owner).toHaveURL(/\/desk\/waivers\?published=v1$/);

    await customer.goto("/signup");
    await screenshots(customer, "customer-signup");
    await signUpDemoCustomer(customer, {
      firstName: "Alex", lastName: `Gym${unique}`, phone: "2505550100", dateOfBirth: "1990-01-01",
    });
    await customer.goto("/me/explore");
    await screenshots(customer, "explore");
    await customer.getByRole("searchbox", { name: "Search gyms" }).fill(gymName);
    await customer.getByRole("button", { name: gymName, exact: true }).click();
    await expect(customer).toHaveURL(/\/me\/register$/);
    await screenshots(customer, "registration");
    await customer.getByRole("link", { name: "Sign waiver", exact: true }).click();
    await expect(customer.getByText("Only this new gym's waiver wording.")).toBeVisible();
    await expect(customer.getByText("This is placeholder wording")).not.toBeVisible();
    await signWaiverForm(customer);
    await customer.getByRole("link", { name: "View your waiver" }).click();
    await expect(customer).toHaveURL(/\/me\/waiver\/[0-9a-f-]+$/);
    const waiverId = customer.url().split("/").pop()!;
    await expect(customer.getByText("Only this new gym's waiver wording.")).toBeVisible();
    const pdf = await customer.request.get(`/me/waiver/${waiverId}/pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");

    await customer.goto("/me");
    await screenshots(customer, "dashboard");
    await customer.getByRole("button", { name: gymName }).click();
    await customer.getByRole("menuitem", { name: "Elevate Demo Gym" }).click();
    await expect(customer.getByRole("button", { name: "Elevate Demo Gym" })).toBeVisible();
    await customer.goto("/me/explore");
    await customer.getByRole("searchbox", { name: "Search gyms" }).fill(gymName);
    const joinedGym = customer.getByRole("button", { name: `${gymName} Joined`, exact: true });
    await expect(joinedGym).toContainText("Joined");
    await joinedGym.click();
    await expect(customer).toHaveURL(/\/me$/);
    await expect(customer.getByRole("button", { name: gymName })).toBeVisible();

    const stranger = await browser.newContext();
    const desk = await stranger.newPage();
    try {
      await desk.goto("/login");
      await desk.getByLabel("Email").fill("desk");
      await desk.getByLabel("Password").fill("desk");
      await desk.getByRole("button", { name: "Log in", exact: true }).click();
      await expect(desk).toHaveURL(/\/desk$/);
      expect((await desk.request.get(`/desk/waivers/${waiverId}/pdf`)).status()).toBe(404);
    } finally {
      await stranger.close();
    }
  } finally {
    await ownerContext.close();
    await customerContext.close();
  }
});
