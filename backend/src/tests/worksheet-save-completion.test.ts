import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const releaseMock = vi.fn();
const connectMock = vi.fn(async () => ({
  query: queryMock,
  release: releaseMock
}));

vi.mock("../db/pool.js", () => ({
  pool: {
    connect: connectMock
  }
}));

describe("saveWorksheetAnswers", () => {
  beforeEach(() => {
    queryMock.mockReset();
    releaseMock.mockReset();
    connectMock.mockClear();
  });

  it("rejects saving answers for a completed worksheet", async () => {
    queryMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ id: "worksheet-1", status: "completed" }] })
      .mockResolvedValueOnce(undefined);

    const { saveWorksheetAnswers } = await import("../repositories/worksheet.repository.js");

    await expect(
      saveWorksheetAnswers({
        worksheetId: "worksheet-1",
        userId: "user-1",
        answers: [{ questionId: "question-1", answerText: "7" }],
        elapsedSeconds: 0,
        status: "partial"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Completed worksheets cannot be changed"
    });
  });

  it("rejects saving answers for a worksheet the caller does not own", async () => {
    queryMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(undefined);

    const { saveWorksheetAnswers } = await import("../repositories/worksheet.repository.js");

    await expect(
      saveWorksheetAnswers({
        worksheetId: "worksheet-1",
        userId: "user-2",
        answers: [{ questionId: "question-1", answerText: "7" }],
        elapsedSeconds: 0,
        status: "partial"
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Worksheet not found"
    });
  });

  it("persists elapsed seconds on worksheet saves", async () => {
    queryMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ id: "worksheet-1", status: "partial" }] })
      .mockResolvedValueOnce({ rows: [{ id: "attempt-1" }] })
      .mockResolvedValueOnce({ rows: [{ id: "question-1" }] })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const { saveWorksheetAnswers } = await import("../repositories/worksheet.repository.js");

    await saveWorksheetAnswers({
      worksheetId: "worksheet-1",
      userId: "user-1",
      answers: [{ questionId: "question-1", answerText: "7" }],
      elapsedSeconds: 92,
      status: "partial"
    });

    expect(queryMock.mock.calls.some((call) => Array.isArray(call[1]) && call[1].includes(92))).toBe(true);
  });

  it("does not update user statistics for non-competitive imported worksheets", async () => {
    queryMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ id: "worksheet-2", status: "partial", awards_credit: false }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "question-1",
            question_order: 1,
            operation: "+",
            left_operand: 2,
            right_operand: 3,
            display_text: "2 + 3 =",
            correct_answer: 5
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [{ id: "attempt-1", user_id: "user-1", elapsed_seconds: 142 }] })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const { submitWorksheet } = await import("../repositories/worksheet.repository.js");

    const result = await submitWorksheet({
      worksheetId: "worksheet-2",
      userId: "user-1",
      answers: ["5"]
    });

    expect(result).toMatchObject({
      scoreCorrect: 1,
      scoreTotal: 1,
      accuracyPercentage: 100,
      elapsedSeconds: 142
    });
    expect(queryMock.mock.calls.some((call) => String(call[0]).includes("INSERT INTO user_statistics"))).toBe(false);
  });
});
