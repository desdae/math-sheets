import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";

const { exchangeCodeForGoogleProfileMock, findOrCreateUserFromGoogleProfileMock, issueSessionTokensMock, revokeRefreshTokenFromCookieMock } = vi.hoisted(() => ({
  exchangeCodeForGoogleProfileMock: vi.fn(),
  findOrCreateUserFromGoogleProfileMock: vi.fn(),
  issueSessionTokensMock: vi.fn(),
  revokeRefreshTokenFromCookieMock: vi.fn()
}));

vi.mock("../services/google-oauth.service.js", async () => {
  const actual = await vi.importActual<typeof import("../services/google-oauth.service.js")>(
    "../services/google-oauth.service.js"
  );

  return {
    ...actual,
    exchangeCodeForGoogleProfile: exchangeCodeForGoogleProfileMock
  };
});

vi.mock("../repositories/user.repository.js", async () => {
  const actual = await vi.importActual<typeof import("../repositories/user.repository.js")>(
    "../repositories/user.repository.js"
  );

  return {
    ...actual,
    findOrCreateUserFromGoogleProfile: findOrCreateUserFromGoogleProfileMock
  };
});

vi.mock("../services/token.service.js", async () => {
  const actual = await vi.importActual<typeof import("../services/token.service.js")>(
    "../services/token.service.js"
  );

  return {
    ...actual,
    issueSessionTokens: issueSessionTokensMock,
    revokeRefreshTokenFromCookie: revokeRefreshTokenFromCookieMock
  };
});

describe("google oauth security", () => {
  beforeEach(() => {
    exchangeCodeForGoogleProfileMock.mockReset();
    findOrCreateUserFromGoogleProfileMock.mockReset();
    issueSessionTokensMock.mockReset();
    revokeRefreshTokenFromCookieMock.mockReset();
  });

  it("adds a state value to the google redirect", async () => {
    const response = await request(createApp()).get("/api/auth/google");

    if (response.status === 302) {
      expect(response.headers.location).toContain("state=");
      const cookies = response.headers["set-cookie"];
      const cookieHeader = Array.isArray(cookies) ? cookies.join(";") : String(cookies ?? "");

      expect(cookieHeader).toContain("mathsheets_oauth_state=");
      return;
    }

    expect(response.status).toBe(503);
  });

  it("rejects callback requests with a missing oauth state", async () => {
    const response = await request(createApp()).get("/api/auth/google/callback?code=test-code");

    expect(response.status).toBe(401);
    expect(response.body.message).toContain("Invalid oauth state");
  });

  it("redirects without leaking an access token in the callback url", async () => {
    exchangeCodeForGoogleProfileMock.mockResolvedValue({
      googleSub: "google-sub-1",
      email: "kid@example.com",
      displayName: "Kid Example",
      avatarUrl: null
    });
    findOrCreateUserFromGoogleProfileMock.mockResolvedValue({ id: "user-1" });
    issueSessionTokensMock.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token"
    });

    const agent = request.agent(createApp());
    const start = await agent.get("/api/auth/google");

    if (start.status !== 302) {
      expect(start.status).toBe(503);
      return;
    }

    const cookies = start.headers["set-cookie"];
    const cookieList = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
    const stateCookie = cookieList.find((value: string) => value.startsWith("mathsheets_oauth_state="));
    const state = /mathsheets_oauth_state=([^;]+)/.exec(String(stateCookie))?.[1];

    const callback = await agent.get(`/api/auth/google/callback?code=test-code&state=${state}`);

    expect(callback.status).toBe(302);
    expect(callback.headers.location).toContain("/auth/callback");
    expect(callback.headers.location).not.toContain("access_token=");
  });

  it("revoke the refresh token record on logout", async () => {
    const response = await request(createApp())
      .post("/api/auth/logout")
      .set("Cookie", ["mathsheets_refresh_token=test-token"]);

    expect(response.status).toBe(204);
    expect(revokeRefreshTokenFromCookieMock).toHaveBeenCalledWith("test-token");
  });
});
