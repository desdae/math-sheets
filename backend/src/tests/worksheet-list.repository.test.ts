import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../db/pool.js", () => ({
  pool: {
    query: queryMock
  }
}));

describe("listWorksheetsByUserId", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("includes score summary fields when worksheet attempts have been completed", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: "worksheet-1",
          title: "Mixed Sprint",
          status: "completed",
          difficulty: "medium",
          problem_count: 12,
          allowed_operations: ["+", "/"],
          number_range_min: 1,
          number_range_max: 100,
          worksheet_size: "medium",
          clean_division_only: true,
          source: "generated",
          created_at: "2026-04-13T08:15:00.000Z",
          submitted_at: "2026-04-13T08:25:00.000Z",
          score_correct: 11,
          score_total: 12,
          accuracy_percentage: "91.67"
        }
      ]
    });

    const { listWorksheetsByUserId } = await import("../repositories/worksheet.repository.js");
    const rows = await listWorksheetsByUserId("user-1");

    expect(rows[0]).toMatchObject({
      id: "worksheet-1",
      result: {
        scoreCorrect: 11,
        scoreTotal: 12,
        accuracyPercentage: 91.67
      }
    });
  });
});
