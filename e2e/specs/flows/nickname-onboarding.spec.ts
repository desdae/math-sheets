import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";
import { resetE2EDatabase } from "../../utils/database";

test.beforeEach(async () => {
  await resetE2EDatabase();
});

test("first sign-in requires a public nickname before entering the app", async ({ page }) => {
  const response = await page.context().request.post("http://127.0.0.1:3001/api/test-auth/login", {
    data: {
      email: "privacy@example.com"
    }
  });

  expect(response.ok()).toBeTruthy();
  await page.goto("/auth/callback");

  await expect(page).toHaveURL(/\/complete-profile$/);
  await page.getByTestId("nickname-input").fill("Quiet Fox");
  await page.getByTestId("nickname-submit").click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("dashboard-page")).toContainText("Quiet Fox");
});

test("signed-in user can update their nickname later from profile", async ({ page }) => {
  const response = await page.context().request.post("http://127.0.0.1:3001/api/test-auth/login", {
    data: {
      email: "profile@example.com",
      publicNickname: "Quiet Fox"
    }
  });

  expect(response.ok()).toBeTruthy();
  await page.goto("/auth/callback");

  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/profile");
  await page.getByTestId("profile-nickname-input").fill("Brave Owl");
  await page.getByTestId("profile-nickname-save").click();
  await expect(page.getByTestId("profile-page")).toContainText("Brave Owl");
});
