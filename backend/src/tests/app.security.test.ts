import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

describe("app security headers", () => {
  it("adds representative hardening headers to API responses", async () => {
    const app = createApp();

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["referrer-policy"]).toBeTruthy();
  });
});
