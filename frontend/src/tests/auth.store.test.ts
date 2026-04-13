import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../stores/auth";

const apiFetchMock = vi.fn();
const setStoredTokenMock = vi.fn();

vi.mock("../lib/api", () => ({
  authTokenStorageKey: "mathsheets.access_token",
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
  setStoredToken: (...args: unknown[]) => setStoredTokenMock(...args)
}));

describe("auth store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiFetchMock.mockReset();
    setStoredTokenMock.mockReset();
    localStorage.clear();
  });

  it("stores an access token", () => {
    const store = useAuthStore();
    store.setAccessToken("token-123");
    expect(store.accessToken).toBe("token-123");
  });

  it("marks users without a public nickname as needing onboarding", async () => {
    const store = useAuthStore();
    apiFetchMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "kid@example.com",
        publicNickname: null
      }
    });

    await store.fetchMe();

    expect(store.user).toEqual({
      id: "user-1",
      email: "kid@example.com",
      publicNickname: null
    });
    expect(store.needsNickname).toBe(true);
  });

  it("restores a session from the refresh cookie before fetching the current user", async () => {
    const store = useAuthStore();
    apiFetchMock
      .mockResolvedValueOnce({ accessToken: "fresh-token" })
      .mockResolvedValueOnce({
        user: {
          id: "user-2",
          email: "fox@example.com",
          publicNickname: "Quiet Fox"
        }
      });

    await store.restoreSessionFromRefreshCookie();

    expect(apiFetchMock.mock.calls[0]?.[0]).toBe("/auth/refresh");
    expect(apiFetchMock.mock.calls[1]?.[0]).toBe("/auth/me");
    expect(store.accessToken).toBe("fresh-token");
    expect(store.user?.publicNickname).toBe("Quiet Fox");
  });
});
