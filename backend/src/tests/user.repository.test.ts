import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../db/pool.js", () => ({
  pool: {
    query: queryMock
  }
}));

describe("findOrCreateUserFromGoogleProfile", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("persists a public nickname column without overwriting it from later Google profile updates", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: "user-1",
            email: "kid@example.com",
            display_name: "Changed Google Name",
            public_nickname: "Quiet Fox",
            avatar_url: "https://example.com/new-avatar.png"
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] });

    const { findOrCreateUserFromGoogleProfile } = await import("../repositories/user.repository.js");

    const user = await findOrCreateUserFromGoogleProfile({
      googleSub: "google-sub-1",
      email: "kid@example.com",
      displayName: "Changed Google Name",
      avatarUrl: "https://example.com/new-avatar.png"
    });

    expect(String(queryMock.mock.calls[0]?.[0])).toContain("public_nickname");
    expect(String(queryMock.mock.calls[0]?.[0])).not.toContain("public_nickname = EXCLUDED.display_name");
    expect(user.public_nickname).toBe("Quiet Fox");
  });
});
