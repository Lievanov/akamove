import { test, expect } from "@playwright/test";
import { USERS } from "./fixtures.mjs";
import { login, uniqueEmail, latestEmailLink } from "./helpers.mjs";

test.describe("email + password auth", () => {
  test("sign up → confirm via email → onboarding", async ({ page }) => {
    const email = uniqueEmail("signup");
    await page.goto("/login?mode=signup");
    await page.getByLabel("Your name").fill("Fresh Owner");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Test1234!");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(email)).toBeVisible();

    await page.goto(await latestEmailLink(email));
    await expect(page).toHaveURL(/\/onboarding\/create-tenant/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Create your studio" })).toBeVisible();
  });

  test("short password is rejected on sign-up", async ({ page }) => {
    await page.goto("/login?mode=signup");
    await page.getByLabel("Your name").fill("Short Pass");
    await page.getByLabel("Email").fill(uniqueEmail("short"));
    await page.getByLabel("Password").fill("abc");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Use at least 8 characters")).toBeVisible();
  });

  test("wrong password shows an error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(USERS.proAdmin.email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("That email and password don't match")).toBeVisible();
  });

  test("user without a studio goes to onboarding", async ({ page }) => {
    await login(page, USERS.noStudio.email);
    await expect(page).toHaveURL(/\/onboarding\/create-tenant/);
  });

  test("pending invite attaches the user to the studio on first login", async ({ page }) => {
    await login(page, USERS.invited.email);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page).not.toHaveURL(/onboarding/);
  });

  test("student accounts are sent away from the dashboard", async ({ page }) => {
    await login(page, USERS.student.email);
    await expect(page).not.toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });
});
