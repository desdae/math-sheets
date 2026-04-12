import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("profile page renders in anonymous mode", async ({ page }) => {
  await page.goto("/profile");

  await expect(page.getByTestId("profile-page")).toBeVisible();
  await expect(page.getByText("Sign in with Google")).toBeVisible();
});
