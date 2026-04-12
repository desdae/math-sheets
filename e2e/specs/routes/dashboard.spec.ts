import { test, expect } from "../../fixtures/base";

test("dashboard page renders for anonymous users", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByTestId("dashboard-page")).toBeVisible();
  await expect(page.getByText("Anonymous practice mode")).toBeVisible();
});

test("dashboard links to worksheet generation", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "New worksheet" }).click();

  await expect(page).toHaveURL(/\/generate$/);
});
