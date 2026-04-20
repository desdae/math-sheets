import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { env } from "../config/env.js";
import { refreshCookieName } from "../services/token.service.js";

const {
  exchangeCodeForGoogleProfileMock,
  findOrCreateUserFromGoogleProfileMock,
  issueSessionTokensMock,
  revokeRefreshTokenFromCookieMock,
  rotateRefreshTokenMock
} = vi.hoisted(() => ({
  exchangeCodeForGoogleProfileMock: vi.fn(),
  findOrCreateUserFromGoogleProfileMock: vi.fn(),
  issueSessionTokensMock: vi.fn(),
  revokeRefreshTokenFromCookieMock: vi.fn(),
  rotateRefreshTokenMock: vi.fn()
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
    revokeRefreshTokenFromCookie: revokeRefreshTokenFromCookieMock,
    rotateRefreshToken: rotateRefreshTokenMock
  };
});

describe("google oauth security", () => {
  const originalNodeEnv = env.NODE_ENV;
  const browserHeaders = {
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-CH-UA-Platform": "\"Windows\"",
    "User-Agent": "MathsheetsAuthTest/1.0"
  };

  beforeEach(() => {
    env.NODE_ENV = originalNodeEnv;
    exchangeCodeForGoogleProfileMock.mockReset();
    findOrCreateUserFromGoogleProfileMock.mockReset();
    issueSessionTokensMock.mockReset();
    revokeRefreshTokenFromCookieMock.mockReset();
    rotateRefreshTokenMock.mockReset();
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

  it("accepts a valid signed oauth state when the browser drops the oauth cookie", async () => {
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

    const start = await request(createApp()).get("/api/auth/google").set(browserHeaders);

    if (start.status !== 302) {
      expect(start.status).toBe(503);
      return;
    }

    const state = new URL(String(start.headers.location), "https://api.mathsheet.app").searchParams.get("state");
    const callback = await request(createApp())
      .get(`/api/auth/google/callback?code=test-code&state=${encodeURIComponent(String(state ?? ""))}`)
      .set(browserHeaders);

    expect(callback.status).toBe(302);
    expect(callback.headers.location).toContain("/auth/callback");
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
    const start = await agent.get("/api/auth/google").set(browserHeaders);

    if (start.status !== 302) {
      expect(start.status).toBe(503);
      return;
    }

    const cookies = start.headers["set-cookie"];
    const cookieList = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
    const stateCookie = cookieList.find((value: string) => value.startsWith("mathsheets_oauth_state="));
    const state = /mathsheets_oauth_state=([^;]+)/.exec(String(stateCookie))?.[1];

    const callback = await agent
      .get(`/api/auth/google/callback?code=test-code&state=${state}`)
      .set(browserHeaders);

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

  it("sets refresh cookies without Secure in development", async () => {
    env.NODE_ENV = "development";
    rotateRefreshTokenMock.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token"
    });

    const response = await request(createApp())
      .post("/api/auth/refresh")
      .set("Cookie", [`${refreshCookieName}=valid-token`]);

    const cookieHeader = Array.isArray(response.headers["set-cookie"])
      ? response.headers["set-cookie"].join(";")
      : String(response.headers["set-cookie"] ?? "");

    expect(response.status).toBe(200);
    expect(cookieHeader).toContain(`${refreshCookieName}=refresh-token`);
    expect(cookieHeader).not.toContain("Secure");
    expect(cookieHeader).toContain("HttpOnly");
    expect(cookieHeader).toContain("Path=/api/auth");
    expect(cookieHeader).toContain("SameSite=Lax");
  });

  it("sets refresh cookies with Secure in production", async () => {
    env.NODE_ENV = "production";
    env.COOKIE_DOMAIN = "mathsheet.app";
    rotateRefreshTokenMock.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token"
    });

    const response = await request(createApp())
      .post("/api/auth/refresh")
      .set("Cookie", [`${refreshCookieName}=valid-token`]);

    const cookieHeader = Array.isArray(response.headers["set-cookie"])
      ? response.headers["set-cookie"].join(";")
      : String(response.headers["set-cookie"] ?? "");

    expect(response.status).toBe(200);
    expect(cookieHeader).toContain(`${refreshCookieName}=refresh-token`);
    expect(cookieHeader).toContain("Secure");
    expect(cookieHeader).toContain("HttpOnly");
    expect(cookieHeader).toContain("Path=/api/auth");
    expect(cookieHeader).toContain("SameSite=Lax");
    expect(cookieHeader).toContain("Domain=mathsheet.app");
  });

  it("keeps the oauth state cookie scoped to the api host in production", async () => {
    env.NODE_ENV = "production";
    env.COOKIE_DOMAIN = "mathsheet.app";
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
    const start = await agent.get("/api/auth/google").set(browserHeaders);

    if (start.status !== 302) {
      expect(start.status).toBe(503);
      return;
    }

    const startCookieList = Array.isArray(start.headers["set-cookie"]) ? start.headers["set-cookie"] : [];
    const startCookieHeader = startCookieList.join(";");

    expect(startCookieHeader).toContain("mathsheets_oauth_state=");
    expect(startCookieHeader).toContain("HttpOnly");
    expect(startCookieHeader).toContain("Secure");
    expect(startCookieHeader).toContain("Path=/api/auth");
    expect(startCookieHeader).toContain("SameSite=Lax");
    expect(startCookieHeader).not.toContain("Domain=mathsheet.app");

    const stateCookie = startCookieList.find((value: string) => value.startsWith("mathsheets_oauth_state="));
    const state = /mathsheets_oauth_state=([^;]+)/.exec(String(stateCookie))?.[1];

    const callback = await agent
      .get(`/api/auth/google/callback?code=test-code&state=${state}`)
      .set(browserHeaders)
      .set("Cookie", [String(stateCookie)]);

    expect(callback.status).toBe(302);

    const callbackCookieList = Array.isArray(callback.headers["set-cookie"]) ? callback.headers["set-cookie"] : [];
    const clearedStateCookie = callbackCookieList.find((value: string) => value.startsWith("mathsheets_oauth_state="));

    expect(String(clearedStateCookie)).toContain("mathsheets_oauth_state=;");
    expect(String(clearedStateCookie)).not.toContain("Domain=mathsheet.app");
    expect(String(clearedStateCookie)).toContain("Path=/api/auth");
  });

  it("returns 401 when the refresh cookie is missing", async () => {
    rotateRefreshTokenMock.mockRejectedValue(new Error("Missing refresh token"));

    const response = await request(createApp()).post("/api/auth/refresh");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Unauthorized");
  });
});
