import { test, expect } from "@playwright/test";
import { authFile } from "./fixtures.mjs";

// Classes page: the class catalog with each class's schedule and enrollment
// count; a class opens its roster (seed: Ana paid $60 for Salsa 1, which
// meets Mondays at 6 PM at Downtown).
test.use({ storageState: authFile("proAdmin") });

test("lists classes by type with schedule and enrollment", async ({ page }) => {
  await page.goto("/dashboard/classes");

  const salsa = page.getByRole("region", { name: "Salsa" });
  await expect(salsa).toBeVisible();
  const row = salsa.getByRole("row", { name: /Mon 6:00 PM · Downtown/ });
  await expect(row).toBeVisible();
  await expect(row.getByRole("cell").last()).toHaveText("1");
  await expect(page.getByRole("region", { name: "Bachata" })).toBeVisible();
});

test("opens a class roster with its schedule and students", async ({ page }) => {
  await page.goto("/dashboard/classes");
  await page
    .getByRole("row", { name: /Mon 6:00 PM · Downtown/ })
    .getByRole("link")
    .click();

  await expect(page).toHaveURL(/\/dashboard\/classes\/[0-9a-f-]+\?periodId=/);
  const schedule = page.getByRole("region", { name: "Schedule" });
  await expect(schedule.getByText("Monday")).toBeVisible();
  await expect(schedule.getByText("6:00 PM")).toBeVisible();
  await expect(schedule.getByText("Downtown")).toBeVisible();

  const students = page.getByRole("region", { name: /Students/ });
  const ana = students.getByRole("row", { name: /Ana Lopez/ });
  await expect(ana).toBeVisible();
  await expect(ana).toContainText("$60.00");
});
