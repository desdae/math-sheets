import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("completed worksheets reopen in a locked state", async ({ page }) => {
  await page.goto("/generate");
  await page.getByTestId("generate-submit").click();
  await page.getByTestId("answer-input-1").fill("5");
  await expect(page.getByTestId("worksheet-save-status")).toContainText("Saved just now");
  await page.getByTestId("submit-worksheet-button").click();
  await expect(page.getByTestId("worksheet-submit-confirm")).toContainText("Submit with unanswered problems?");
  await page.getByRole("button", { name: "Submit with blanks" }).click();
  await expect(page.getByTestId("worksheet-save-status")).toContainText("Completed and locked");

  await page.goto("/worksheets");
  await page.getByTestId("saved-local-worksheet-link").first().click();

  await expect(page.getByTestId("worksheet-page")).toBeVisible();
  await expect(page.getByTestId("answer-input-1")).toBeDisabled();
});
