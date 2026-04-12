import { expect } from "@playwright/test";
import { test } from "../../fixtures/auth";

test("authenticated user can create and submit a worksheet", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByTestId("dashboard-page")).toBeVisible();
  await expect(page.getByText("Welcome back, E2E User")).toBeVisible();

  await page.goto("/generate");
  await page.getByTestId("generate-submit").click();
  await expect(page).toHaveURL(/\/worksheets\/.+$/);
  await expect(page.getByTestId("worksheet-grid")).toBeVisible();

  await page.getByTestId("answer-input-1").fill("7");
  await expect(page.getByTestId("worksheet-save-status")).toContainText("Saved just now");
  await expect(page.getByTestId("worksheet-page")).toBeVisible();

  await expect(page.getByTestId("worksheet-submit-warning")).toContainText("problems are still empty");
  await page.getByTestId("submit-worksheet-button").click();
  await expect(page.getByTestId("worksheet-submit-confirm")).toContainText("Submit with unanswered problems?");
  await page.getByRole("button", { name: "Submit with blanks" }).click();
  await expect(page.getByTestId("worksheet-save-status")).toContainText("Completed and locked");
  await expect(page.getByTestId("answer-input-1")).toBeDisabled();

  await page.goto("/worksheets");
  await expect(page.getByTestId("saved-worksheets-page")).toBeVisible();
  await expect(page.getByTestId("saved-remote-worksheet-link")).toHaveCount(1);

  await page.getByTestId("saved-remote-worksheet-link").first().click();
  await expect(page.getByTestId("worksheet-page")).toBeVisible();
  await expect(page.getByTestId("answer-input-1")).toBeDisabled();
});
