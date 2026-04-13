import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../db/pool.js", () => ({
  pool: {
    query: queryMock
  }
}));

describe("getLeaderboard", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("sorts and returns leaderboard rows using public nicknames", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          user_id: "user-1",
          public_nickname: "Quiet Fox",
          worksheets_completed: 5,
          problems_solved: 60,
          accuracy_percentage: 95
        }
      ]
    });

    const { getLeaderboard } = await import("../repositories/leaderboard.repository.js");
    const rows = await getLeaderboard({ period: "daily", metric: "worksheets" });

    expect(String(queryMock.mock.calls[0]?.[0])).toContain("public_nickname ASC");
    expect(rows[0].public_nickname).toBe("Quiet Fox");
  });
});
