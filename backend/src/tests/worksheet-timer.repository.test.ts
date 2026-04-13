import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../db/pool.js", () => ({
  pool: {
    query: queryMock
  }
}));

describe("worksheet timer repository mapping", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("includes elapsed seconds in worksheet detail responses", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: "worksheet-1",
            title: "Timed Worksheet",
            status: "partial",
            difficulty: "easy",
            problem_count: 4,
            allowed_operations: ["+"],
            number_range_min: 1,
            number_range_max: 10,
            worksheet_size: "small",
            clean_division_only: true,
            source: "generated",
            created_at: "2026-04-13T10:00:00.000Z",
            submitted_at: null,
            elapsed_seconds: 185
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const { getWorksheetDetails } = await import("../repositories/worksheet.repository.js");
    const result = await getWorksheetDetails("worksheet-1", "user-1");

    expect(result.worksheet?.elapsedSeconds).toBe(185);
  });
});
