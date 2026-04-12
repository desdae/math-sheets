import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it } from "vitest";
import { useAuthStore } from "../stores/auth";

describe("auth store", () => {
  it("stores an access token", () => {
    setActivePinia(createPinia());
    const store = useAuthStore();
    store.setAccessToken("token-123");
    expect(store.accessToken).toBe("token-123");
  });
});
