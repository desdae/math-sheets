import { describe, expect, it } from "vitest";
import { getLeaderboard } from "../repositories/leaderboard.repository.js";

describe("getLeaderboard", () => {
  it("supports the daily worksheets metric", async () => {
    const rows = await getLeaderboard({ period: "daily", metric: "worksheets" });
    expect(Array.isArray(rows)).toBe(true);
  });
});
