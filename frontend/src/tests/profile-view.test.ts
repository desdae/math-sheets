import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfileView from "../views/ProfileView.vue";
import { useAuthStore } from "../stores/auth";

const apiFetchMock = vi.fn();
const setStoredTokenMock = vi.fn();

vi.mock("../lib/api", () => ({
  authTokenStorageKey: "mathsheets.access_token",
  setStoredToken: (...args: unknown[]) => setStoredTokenMock(...args),
  apiFetch: (...args: unknown[]) => apiFetchMock(...args)
}));

describe("ProfileView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiFetchMock.mockReset();
    setStoredTokenMock.mockReset();
  });

  it("separates public nickname from private account details", async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: "user-1",
      email: "kid@example.com",
      publicNickname: "Quiet Fox"
    };

    apiFetchMock.mockResolvedValue({
      worksheets_completed: 3,
      problems_solved: 24,
      correct_answers: 20,
      last_activity_date: "2026-04-13"
    });

    const wrapper = mount(ProfileView);
    await flushPromises();

    expect(wrapper.text()).toContain("Public identity");
    expect(wrapper.text()).toContain("Private account");
    expect(wrapper.text()).toContain("Quiet Fox");
    expect(wrapper.text()).toContain("kid@example.com");
  });
});
