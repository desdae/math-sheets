import { expect, test } from "../../fixtures/base";

test("first visit shows consent banner and legal pages are reachable", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("cookie-consent-banner")).toBeVisible();
  await page.getByRole("link", { name: "Read the Privacy Policy" }).click();
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();

  await page.goto("/");
  await page.getByTestId("reject-non-essential").click();
  await expect(page.getByTestId("cookie-consent-banner")).toBeHidden();

  await page.getByRole("button", { name: /privacy & cookies/i }).click();
  await expect(page.getByRole("heading", { name: /privacy & cookies/i })).toBeVisible();
});
