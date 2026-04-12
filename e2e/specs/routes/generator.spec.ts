import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("generator page renders the form", async ({ page }) => {
  await page.goto("/generate");

  await expect(page.getByTestId("generator-page")).toBeVisible();
  await expect(page.getByTestId("generator-form")).toBeVisible();
});
