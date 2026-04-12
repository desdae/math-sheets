import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

const solveDisplayText = (displayText: string) => {
  const match = displayText.match(/(-?\d+)\s*([+\-*/])\s*(-?\d+)/);

  if (!match) {
    throw new Error(`Unable to parse question text: ${displayText}`);
  }

  const left = Number(match[1]);
  const operation = match[2];
  const right = Number(match[3]);

  switch (operation) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return left / right;
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
};

test("anonymous user can generate, save, reopen, and submit a worksheet", async ({ page }) => {
  await page.goto("/generate");
  await page.getByTestId("generate-submit").click();

  await expect(page).toHaveURL(/\/worksheets\/.+$/);
  await expect(page.getByTestId("worksheet-grid")).toBeVisible();
  const firstQuestionText = await page.locator('[data-testid="worksheet-cell-1"] label').textContent();
  const firstAnswer = solveDisplayText(firstQuestionText ?? "");

  await page.getByTestId("answer-input-1").fill(String(firstAnswer));
  await expect(page.getByTestId("worksheet-save-status")).toContainText("Saved just now");
  await expect(page.getByTestId("answer-state-2")).toHaveAttribute("data-answer-state", "empty");

  await page.goto("/worksheets");
  await expect(page.getByTestId("saved-worksheets-page")).toBeVisible();

  await page.getByTestId("saved-local-worksheet-link").first().click();
  await expect(page.getByTestId("worksheet-page")).toBeVisible();
  await expect(page.getByTestId("answer-input-1")).toHaveValue(String(firstAnswer));

  await expect(page.getByTestId("worksheet-submit-warning")).toContainText("problems are still empty");
  await page.getByTestId("submit-worksheet-button").click();
  await expect(page.getByTestId("worksheet-submit-confirm")).toContainText("Submit with unanswered problems?");
  await page.getByRole("button", { name: "Submit with blanks" }).click();
  await expect(page.getByTestId("worksheet-save-status")).toContainText("Completed and locked");
  await expect(page.getByTestId("answer-state-1")).toHaveAttribute("data-answer-state", "correct");
});
