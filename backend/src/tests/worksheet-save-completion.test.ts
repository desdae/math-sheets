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
      .mockResolvedValueOnce({ rows: [{ status: "completed" }] })
      .mockResolvedValueOnce(undefined);

    const { saveWorksheetAnswers } = await import("../repositories/worksheet.repository.js");

    await expect(
      saveWorksheetAnswers({
        worksheetId: "worksheet-1",
        answers: [{ questionId: "question-1", answerText: "7" }],
        elapsedSeconds: 0,
        status: "partial"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Completed worksheets cannot be changed"
    });
  });
});
