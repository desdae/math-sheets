import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";
import { resetE2EDatabase } from "../../utils/database";

test.beforeEach(async () => {
  await resetE2EDatabase();
});

test("signed-in user can import local anonymous worksheets", async ({ page }) => {
  await page.goto("/generate");
  await page.getByTestId("generate-submit").click();
  await expect(page).toHaveURL(/\/worksheets\/.+$/);
  await expect(page.getByTestId("worksheet-grid")).toBeVisible();

  await page.getByTestId("answer-input-1").fill("9");
  await expect(page.getByTestId("worksheet-save-status")).toContainText("Saved just now");

  const response = await page.context().request.post("http://127.0.0.1:3001/api/test-auth/login", {
    data: {
      email: "importer@example.com"
    }
  });

  expect(response.ok()).toBeTruthy();
  await page.goto("/auth/callback");

  await expect(page).toHaveURL(/\/complete-profile$/);
  await page.getByTestId("nickname-input").fill("Import User");
  await page.getByTestId("nickname-submit").click();
  await expect(page.getByText("Import saved progress?")).toBeVisible();
  await page.getByTestId("import-local-confirm").click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/worksheets");
  await expect(page.getByTestId("saved-worksheets-page")).toBeVisible();
  await expect(page.getByTestId("saved-local-worksheet-link")).toHaveCount(0);
  await expect(page.getByTestId("saved-remote-worksheet-link")).toHaveCount(1);
});
