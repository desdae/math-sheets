import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("header navigation exposes the primary worksheet action", async ({ page }) => {
  await page.goto("/generate");

  await expect(page.getByRole("link", { name: "Saved" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Leaderboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New worksheet" })).toBeVisible();
});
