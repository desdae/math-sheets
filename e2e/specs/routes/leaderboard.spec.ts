import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";
import { resetE2EDatabase } from "../../utils/database";

test.beforeEach(async () => {
  await resetE2EDatabase();
});

test("leaderboard highlights the signed-in user's standing", async ({ page }) => {
  const loginResponse = await page.context().request.post("http://127.0.0.1:3001/api/test-auth/login", {
    data: {
      email: "ranked@example.com",
      publicNickname: "Ranked User"
    }
  });

  const loginPayload = (await loginResponse.json()) as { accessToken: string };

  const createResponse = await page.context().request.post("http://127.0.0.1:3001/api/worksheets", {
    headers: {
      Authorization: `Bearer ${loginPayload.accessToken}`
    },
    data: {
      problemCount: 12,
      difficulty: "easy",
      allowedOperations: ["+"],
      numberRangeMin: 1,
      numberRangeMax: 10,
      worksheetSize: "medium",
      cleanDivisionOnly: true
    }
  });

  const worksheetPayload = (await createResponse.json()) as {
    worksheet: { id: string };
    questions: Array<{ correctAnswer: number }>;
  };

  await page.context().request.post(`http://127.0.0.1:3001/api/worksheets/${worksheetPayload.worksheet.id}/submit`, {
    headers: {
      Authorization: `Bearer ${loginPayload.accessToken}`
    },
    data: {
      answers: worksheetPayload.questions.map((question) => String(question.correctAnswer))
    }
  });

  await page.addInitScript((token: string) => {
    window.localStorage.setItem("mathsheets.access_token", token);
  }, loginPayload.accessToken);

  await page.goto("/leaderboard");

  await expect(page.getByTestId("leaderboard-page")).toBeVisible();
  await expect(page.getByText("Your standing")).toBeVisible();
  await expect(page.getByText("You are ranked #1")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Ranked User" })).toBeVisible();
});
