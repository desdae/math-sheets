import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { isGoogleOAuthConfigured } from "../services/google-oauth.service.js";

describe("health route", () => {
  it("returns ok", async () => {
    const response = await request(createApp()).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });
});

describe("worksheet routes", () => {
  it("generates a worksheet", async () => {
    const response = await request(createApp()).post("/api/worksheets/generate").send({
      problemCount: 8,
      difficulty: "medium",
      allowedOperations: ["+", "*"],
      numberRangeMin: 1,
      numberRangeMax: 20,
      worksheetSize: "medium",
      cleanDivisionOnly: true
    });

    expect(response.status).toBe(200);
    expect(response.body.questions).toHaveLength(8);
  });

  it("rejects empty operation selections", async () => {
    const response = await request(createApp()).post("/api/worksheets/generate").send({
      problemCount: 8,
      difficulty: "easy",
      allowedOperations: [],
      numberRangeMin: 1,
      numberRangeMax: 10,
      worksheetSize: "small",
      cleanDivisionOnly: true
    });

    expect(response.status).toBe(400);
  });

  it("rejects worksheet configs that cannot produce enough unique problems", async () => {
    const response = await request(createApp()).post("/api/worksheets/generate").send({
      problemCount: 2,
      difficulty: "easy",
      allowedOperations: ["+"],
      numberRangeMin: 1,
      numberRangeMax: 1,
      worksheetSize: "small",
      cleanDivisionOnly: true
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Unable to generate enough unique problems");
  });
});

describe("auth routes", () => {
  it("returns a clear error when google oauth is not configured", async () => {
    const response = await request(createApp()).get("/api/auth/google");

    if (isGoogleOAuthConfigured()) {
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain("accounts.google.com");
      return;
    }

    expect(response.status).toBe(503);
    expect(response.text).toContain("Google OAuth is not configured");
  });

  it("returns unauthorized for unauthenticated me requests", async () => {
    const response = await request(createApp()).get("/api/auth/me");
    expect(response.status).toBe(401);
  });
});

describe("test auth routes", () => {
  it("logs in an e2e user when enabled", async () => {
    process.env.ENABLE_E2E_AUTH = "true";

    const response = await request(createApp()).post("/api/test-auth/login").send({
      email: "e2e@example.com",
      displayName: "E2E User"
    });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("e2e@example.com");
    expect(response.body.accessToken).toBeTruthy();
  });
});
