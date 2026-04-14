import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";

const { ensureUserForTestingMock, issueSessionTokensMock } = vi.hoisted(() => ({
  ensureUserForTestingMock: vi.fn(),
  issueSessionTokensMock: vi.fn()
}));

vi.mock("../repositories/user.repository.js", async () => {
  const actual = await vi.importActual<typeof import("../repositories/user.repository.js")>(
    "../repositories/user.repository.js"
  );

  return {
    ...actual,
    ensureUserForTesting: ensureUserForTestingMock
  };
});

vi.mock("../services/token.service.js", async () => {
  const actual = await vi.importActual<typeof import("../services/token.service.js")>(
    "../services/token.service.js"
  );

  return {
    ...actual,
    issueSessionTokens: issueSessionTokensMock
  };
});

describe("test auth routes", () => {
  beforeEach(() => {
    ensureUserForTestingMock.mockReset();
    issueSessionTokensMock.mockReset();
    process.env.ENABLE_E2E_AUTH = "false";
    process.env.NODE_ENV = "test";
  });

  it("returns not found outside test mode even if e2e auth is enabled", async () => {
    process.env.NODE_ENV = "production";
    process.env.ENABLE_E2E_AUTH = "true";

    const response = await request(createApp()).post("/api/test-auth/login").send({
      email: "e2e@example.com",
      publicNickname: "E2E User"
    });

    expect(response.status).toBe(404);
  });

  it("logs in an e2e user only when test mode is enabled", async () => {
    process.env.NODE_ENV = "test";
    process.env.ENABLE_E2E_AUTH = "true";
    ensureUserForTestingMock.mockResolvedValue({
      id: "user-1",
      email: "e2e@example.com",
      public_nickname: "E2E User"
    });
    issueSessionTokensMock.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token"
    });

    const response = await request(createApp()).post("/api/test-auth/login").send({
      email: "e2e@example.com",
      publicNickname: "E2E User"
    });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("e2e@example.com");
    expect(response.body.user.publicNickname).toBe("E2E User");
    expect(response.body.accessToken).toBeTruthy();
  });
});
