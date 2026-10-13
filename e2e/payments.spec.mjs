import { test, expect } from "@playwright/test";
import { authFile, USERS } from "./fixtures.mjs";
import { clientAs } from "./helpers.mjs";

// Record payment page: Classes / Event / Punch pass tabs in the payment card.
test.use({ storageState: authFile("proAdmin") });

const studentId = async (email) => {
  const client = await clientAs(USERS.proAdmin.email);
  const { data } = await client.from("student").select("id").eq("email", email).single();
  return data.id;
};

test("switches between class, event and punch pass payments", async ({ page }) => {
  const id = await studentId("ben@student.akamove.test");
  await page.goto(`/dashboard/payments/${id}`);

  await expect(page.getByRole("tab", { name: "Classes" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Select Period")).toBeVisible();

  await page.getByRole("tab", { name: "Event" }).click();
  await expect(page.getByText("Client's Name")).toBeVisible();
  await expect(page.getByText("Select Period")).toHaveCount(0);

  await page.getByRole("tab", { name: "Punch pass" }).click();
  await expect(page.getByRole("button", { name: "Sell pass" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit Payment" })).toHaveCount(0);
});

test("sells a punch pass from the payments screen", async ({ page }) => {
  const id = await studentId("chloe@student.akamove.test");
  await page.goto(`/dashboard/payments/${id}?sell=punch-pass`);

  await expect(page.getByRole("tab", { name: "Punch pass" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Sell pass" }).click();

  await expect(page).toHaveURL(`/dashboard/students/${id}`);
  await expect(page.getByText("Punch pass sold to Chloe Nguyen.")).toBeVisible();
  await expect(page.getByText("entries left")).toBeVisible();
});

// Payments page tabs: Payments / Enrollments / Punch passes.
test("shows enrollments and punch pass sales as tabs", async ({ page }) => {
  // A pass to list (Diego isn't used by the other tests here).
  const id = await studentId("diego@student.akamove.test");
  await page.goto(`/dashboard/payments/${id}?sell=punch-pass`);
  await page.getByRole("button", { name: "Sell pass" }).click();
  await expect(page).toHaveURL(`/dashboard/students/${id}`);

  await page.goto("/dashboard/payments");
  await expect(page.getByRole("tab", { name: "Payments" })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("tab", { name: "Enrollments" }).click();
  await expect(page).toHaveURL("/dashboard/payments?tab=enrollments");
  await expect(page.getByRole("row", { name: /Ana Lopez/ })).toBeVisible();

  await page.getByRole("tab", { name: "Punch passes" }).click();
  await expect(page).toHaveURL("/dashboard/payments?tab=punch-passes");
  const sale = page.getByRole("row", { name: /Diego Ramos/ });
  await expect(sale).toContainText("5-class pass");
  await expect(sale).toContainText("$75.00");

  await page.getByRole("searchbox").fill("nobody-matches-this");
  await expect(page.getByRole("row", { name: /Diego Ramos/ })).toHaveCount(0);
  await page.getByRole("searchbox").fill("Ramos");
  await expect(page.getByRole("row", { name: /Diego Ramos/ })).toBeVisible();
});
