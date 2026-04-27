import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { configureNodeEnv, resetRuntimeEnvForTests } from "../config/env.js";

const configureTestEnv = (overrides: Record<string, unknown> = {}) => {
  configureNodeEnv({
    NODE_ENV: "production",
    APP_BASE_URL: "https://mathsheet.app",
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "client-secret",
    GOOGLE_CALLBACK_URL: "https://api.mathsheet.app/api/auth/google/callback",
    JWT_ACCESS_SECRET: "access-secret",
    JWT_REFRESH_SECRET: "refresh-secret",
    COOKIE_DOMAIN: "mathsheet.app",
    ...overrides
  });
};

describe("app security headers", () => {
  beforeEach(() => {
    resetRuntimeEnvForTests();
    configureTestEnv();
  });

  it("adds representative hardening headers to API responses", async () => {
    const app = createApp();

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["referrer-policy"]).toBeTruthy();
  });

  it("allows configured frontend origins for cross-origin API requests", async () => {
    configureTestEnv({
      CORS_ALLOWED_ORIGINS: "https://mathsheet.app,https://www.mathsheet.app"
    });
    const app = createApp();

    const response = await request(app)
      .get("/api/health")
      .set("Origin", "https://www.mathsheet.app");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("https://www.mathsheet.app");
  });
});
