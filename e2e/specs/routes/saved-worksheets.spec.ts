import { expect, type Page } from "@playwright/test";
import { test } from "../../fixtures/auth";
import { setWorksheetCreatedAt } from "../../utils/database";

const worksheetConfig = {
  problemCount: 8,
  difficulty: "medium",
  allowedOperations: ["+", "/"],
  numberRangeMin: 1,
  numberRangeMax: 100,
  worksheetSize: "medium",
  cleanDivisionOnly: true
} as const;

const createWorksheet = async (page: Page, token: string, options?: { submit?: boolean; createdAt?: string }) => {
  const createResponse = await page.context().request.post("http://127.0.0.1:3001/api/worksheets", {
    headers: {
      Authorization: `Bearer ${token}`
    },
    data: worksheetConfig
  });

  expect(createResponse.ok()).toBeTruthy();
  const payload = (await createResponse.json()) as {
    worksheet: { id: string };
    questions: Array<{ correctAnswer: number }>;
  };

  if (options?.submit) {
    const submitResponse = await page.context().request.post(
      `http://127.0.0.1:3001/api/worksheets/${payload.worksheet.id}/submit`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        data: {
          answers: payload.questions.map((question) => String(question.correctAnswer))
        }
      }
    );

    expect(submitResponse.ok()).toBeTruthy();
  }

  if (options?.createdAt) {
    await setWorksheetCreatedAt(payload.worksheet.id, options.createdAt);
  }

  return payload.worksheet.id;
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "mathsheets.anonymous.worksheets",
      JSON.stringify([
        {
          id: "local-sheet-1",
          title: "Local Builder",
          status: "partial",
          config: {
            problemCount: 10,
            difficulty: "easy",
            allowedOperations: ["+"],
            numberRangeMin: 1,
            numberRangeMax: 10,
            worksheetSize: "small",
            cleanDivisionOnly: true
          },
          questions: [
            {
              questionOrder: 1,
              operation: "+",
              leftOperand: 2,
              rightOperand: 3,
              displayText: "2 + 3 =",
              correctAnswer: 5
            }
          ],
          answers: [""],
          source: "local",
          localImportKey: "local-import-1",
          createdAt: "2026-04-13T09:00:00.000Z"
        }
      ])
    );
  });

  await page.goto("/dashboard");

  const token = await page.evaluate(() => window.localStorage.getItem("mathsheets.access_token"));
  expect(token).toBeTruthy();

  await createWorksheet(page, token!, {
    submit: true,
    createdAt: "2026-04-13T08:15:00.000Z"
  });
  await createWorksheet(page, token!, {
    createdAt: "2026-04-10T09:00:00.000Z"
  });
  await createWorksheet(page, token!, {
    submit: true,
    createdAt: "2026-04-01T09:00:00.000Z"
  });
});

test("groups synced worksheets by date and filters by metadata chips", async ({ page }) => {
  await page.goto("/worksheets");

  await expect(page.getByTestId("saved-worksheets-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "This week" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Earlier" })).toBeVisible();
  await expect(page.getByText("Import new local worksheets")).toBeVisible();
  await expect(page.getByText("100%").first()).toBeVisible();

  await page.getByTestId("worksheet-chip-addition").first().click();
  await expect(page.getByTestId("active-filter-addition")).toBeVisible();
  await expect(page.getByTestId("saved-remote-worksheet-link")).toHaveCount(3);

  await page.getByTestId("worksheet-chip-completed").first().click();
  await expect(page.getByTestId("active-filter-completed")).toBeVisible();
  await expect(page.getByTestId("saved-remote-worksheet-link")).toHaveCount(2);
});

test("keeps chip clicks from navigating and row clicks still open the worksheet", async ({ page }) => {
  await page.goto("/worksheets");

  await page.getByTestId("worksheet-chip-medium").first().click();
  await expect(page).toHaveURL(/\/worksheets$/);

  await page.getByTestId("saved-remote-worksheet-link").first().click();
  await expect(page).toHaveURL(/\/worksheets\/.+/);
  await expect(page.getByTestId("worksheet-page")).toBeVisible();
});
