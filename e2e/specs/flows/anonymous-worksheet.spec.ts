import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("anonymous user can generate, save, reopen, and submit a worksheet", async ({ page }) => {
  await page.goto("/generate");
  await page.getByTestId("generate-submit").click();

  await expect(page).toHaveURL(/\/worksheets\/.+$/);
  await expect(page.getByTestId("worksheet-grid")).toBeVisible();
  await page.getByTestId("answer-input-1").fill("5");
  await page.getByRole("button", { name: "Save progress" }).click();

  await page.goto("/worksheets");
  await expect(page.getByTestId("saved-worksheets-page")).toBeVisible();

  await page.getByTestId("saved-local-worksheet-link").first().click();
  await expect(page.getByTestId("worksheet-page")).toBeVisible();
  await expect(page.getByTestId("answer-input-1")).toHaveValue("5");

  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Completed")).toBeVisible();
});
