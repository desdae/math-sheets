import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

describe("rate limiting", () => {
  it("throttles repeated worksheet generation requests", async () => {
    const app = createApp();
    const payload = {
      problemCount: 8,
      difficulty: "easy",
      allowedOperations: ["+"],
      numberRangeMin: 1,
      numberRangeMax: 10,
      worksheetSize: "small",
      cleanDivisionOnly: true
    };

    const first = await request(app).post("/api/worksheets/generate").send(payload);
    const second = await request(app).post("/api/worksheets/generate").send(payload);
    const third = await request(app).post("/api/worksheets/generate").send(payload);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body.message).toContain("Too many requests");
  });

  it("throttles repeated leaderboard reads", async () => {
    const app = createApp();

    const first = await request(app).get("/api/leaderboards?period=daily&metric=worksheets");
    const second = await request(app).get("/api/leaderboards?period=daily&metric=worksheets");
    const third = await request(app).get("/api/leaderboards?period=daily&metric=worksheets");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
  });
});
