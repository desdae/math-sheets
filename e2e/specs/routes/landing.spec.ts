import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("landing page renders without browser errors", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("landing-page")).toBeVisible();
});
