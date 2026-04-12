import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("saved worksheets page renders", async ({ page }) => {
  await page.goto("/worksheets");

  await expect(page.getByTestId("saved-worksheets-page")).toBeVisible();
});
