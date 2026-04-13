import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { signAccessToken } from "../lib/jwt.js";

const { findUserByIdMock, updatePublicNicknameMock } = vi.hoisted(() => ({
  findUserByIdMock: vi.fn(),
  updatePublicNicknameMock: vi.fn()
}));

vi.mock("../repositories/user.repository.js", async () => {
  const actual = await vi.importActual<typeof import("../repositories/user.repository.js")>(
    "../repositories/user.repository.js"
  );

  return {
    ...actual,
    findUserById: findUserByIdMock,
    updatePublicNickname: updatePublicNicknameMock
  };
});

describe("auth me response", () => {
  beforeEach(() => {
    findUserByIdMock.mockReset();
    updatePublicNicknameMock.mockReset();
  });

  it("returns the public nickname without leaking Google profile fields", async () => {
    findUserByIdMock.mockResolvedValue({
      id: "user-1",
      email: "kid@example.com",
      public_nickname: "Quiet Fox",
      display_name: "Google Name",
      avatar_url: "https://example.com/avatar.png"
    });

    const accessToken = signAccessToken("user-1");
    const response = await request(createApp()).get("/api/auth/me").set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({
      id: "user-1",
      email: "kid@example.com",
      publicNickname: "Quiet Fox"
    });
    expect(response.body.user.displayName).toBeUndefined();
    expect(response.body.user.avatarUrl).toBeUndefined();
  });

  it("updates the signed-in user's public nickname", async () => {
    updatePublicNicknameMock.mockResolvedValue({
      id: "user-1",
      email: "kid@example.com",
      public_nickname: "Quiet Fox"
    });

    const accessToken = signAccessToken("user-1");
    const response = await request(createApp())
      .patch("/api/users/me/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ publicNickname: "Quiet Fox" });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({
      id: "user-1",
      email: "kid@example.com",
      publicNickname: "Quiet Fox"
    });
  });
});
