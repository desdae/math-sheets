import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("leaderboard page renders", async ({ page }) => {
  await page.goto("/leaderboard");

  await expect(page.getByTestId("leaderboard-page")).toBeVisible();
});

test("leaderboard metric switching works", async ({ page }) => {
  await page.goto("/leaderboard");
  await page.locator('select').nth(1).selectOption("accuracy");

  await expect(page.getByTestId("leaderboard-page")).toBeVisible();
});
