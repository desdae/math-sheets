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

describe("createWorksheetWithAttempt", () => {
  beforeEach(() => {
    queryMock.mockReset();
    releaseMock.mockReset();
    connectMock.mockClear();
  });

  it("generates a local import key for signed-in generated worksheets", async () => {
    queryMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rows: [
          {
            id: "worksheet-1",
            title: "Worksheet",
            status: "draft",
            difficulty: "easy",
            problem_count: 1,
            allowed_operations: ["+"],
            number_range_min: 1,
            number_range_max: 10,
            worksheet_size: "small",
            clean_division_only: true,
            source: "generated",
            created_at: "2026-04-13T09:00:00.000Z",
            submitted_at: null
          }
        ]
      })
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
      .mockResolvedValueOnce({
        rows: [{ id: "attempt-1" }]
      })
      .mockResolvedValueOnce(undefined);

    const { createWorksheetWithAttempt } = await import("../repositories/worksheet.repository.js");

    await createWorksheetWithAttempt({
      userId: "user-1",
      title: "Worksheet",
      config: {
        problemCount: 1,
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
      source: "generated"
    });

    expect(queryMock.mock.calls[1]?.[1]?.[11]).toBeTruthy();
  });

  it("preserves an imported worksheet createdAt timestamp", async () => {
    queryMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rows: [
          {
            id: "worksheet-2",
            title: "Imported Worksheet",
            status: "partial",
            difficulty: "medium",
            problem_count: 1,
            allowed_operations: ["+"],
            number_range_min: 1,
            number_range_max: 20,
            worksheet_size: "medium",
            clean_division_only: true,
            source: "imported",
            created_at: "2026-04-10T09:00:00.000Z",
            submitted_at: null
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "question-2",
            question_order: 1,
            operation: "+",
            left_operand: 4,
            right_operand: 5,
            display_text: "4 + 5 =",
            correct_answer: 9
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [{ id: "attempt-2" }]
      })
      .mockResolvedValueOnce(undefined);

    const { createWorksheetWithAttempt } = await import("../repositories/worksheet.repository.js");
    const importedCreatedAt = "2026-04-10T09:00:00.000Z";

    await createWorksheetWithAttempt({
      userId: "user-1",
      title: "Imported Worksheet",
      config: {
        problemCount: 1,
        difficulty: "medium",
        allowedOperations: ["+"],
        numberRangeMin: 1,
        numberRangeMax: 20,
        worksheetSize: "medium",
        cleanDivisionOnly: true
      },
      questions: [
        {
          questionOrder: 1,
          operation: "+",
          leftOperand: 4,
          rightOperand: 5,
          displayText: "4 + 5 =",
          correctAnswer: 9
        }
      ],
      source: "imported",
      createdAt: importedCreatedAt
    });

    expect(queryMock.mock.calls[1]?.[1]?.[12]).toBe(importedCreatedAt);
  });
});
