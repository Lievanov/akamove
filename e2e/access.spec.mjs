import { test, expect } from "@playwright/test";
import { authFile } from "./fixtures.mjs";

// Role + plan access rules (app/dashboard/access.js).
const ADMIN_ONLY = ["/dashboard/settings", "/dashboard/periods", "/dashboard/instructors", "/dashboard/locations"];

test.describe("admin on a paid plan", () => {
  test.use({ storageState: authFile("proAdmin") });

  for (const path of ADMIN_ONLY) {
    test(`can open ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(path);
      await expect(page.getByText("This page is for studio admins")).toHaveCount(0);
    });
  }

  test("sees seeded students", async ({ page }) => {
    await page.goto("/dashboard/students");
    await expect(page.getByRole("heading", { name: "Students" })).toBeVisible();
    await expect(page.getByText("Lopez").first()).toBeVisible();
  });
});

test.describe("staff on a paid plan", () => {
  test.use({ storageState: authFile("proStaff") });

  for (const path of ADMIN_ONLY) {
    test(`is denied ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/dashboard\/access-denied/);
      await expect(page.getByText("This page is for studio admins")).toBeVisible();
    });
  }

  test("can open students and events", async ({ page }) => {
    await page.goto("/dashboard/students");
    await expect(page.getByRole("heading", { name: "Students" })).toBeVisible();
    await page.goto("/dashboard/events");
    await expect(page).toHaveURL("/dashboard/events");
  });
});

test.describe("starter plan (expired trial)", () => {
  test.describe("staff", () => {
    test.use({ storageState: authFile("starterStaff") });

    test("is blocked from the whole dashboard", async ({ page }) => {
      await page.goto("/dashboard/students");
      await expect(page.getByRole("heading", { name: "Ask your studio admin for access" })).toBeVisible();
    });
  });

  test.describe("admin", () => {
    test.use({ storageState: authFile("starterAdmin") });

    test("can still use the dashboard", async ({ page }) => {
      await page.goto("/dashboard/students");
      await expect(page.getByRole("heading", { name: "Students" })).toBeVisible();
    });
  });
});
