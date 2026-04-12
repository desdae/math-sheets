import { expect } from "@playwright/test";
import { test } from "../../fixtures/auth";

test("authenticated user can create and submit a worksheet", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByTestId("dashboard-page")).toBeVisible();
  await expect(page.getByText("Welcome back, E2E User")).toBeVisible();

  await page.goto("/generate");
  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("worksheet-grid")).toBeVisible();

  await page.getByTestId("answer-input-1").fill("7");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByTestId("worksheet-page")).toBeVisible();

  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Completed")).toBeVisible();

  await page.goto("/worksheets");
  await expect(page.getByTestId("saved-worksheets-page")).toBeVisible();
  await expect(page.getByTestId("saved-remote-worksheet-link")).toHaveCount(1);

  await page.getByTestId("saved-remote-worksheet-link").first().click();
  await expect(page.getByTestId("worksheet-page")).toBeVisible();
});
