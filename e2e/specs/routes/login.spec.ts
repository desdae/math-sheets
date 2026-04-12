import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("login page renders without browser errors", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByTestId("login-page")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});
