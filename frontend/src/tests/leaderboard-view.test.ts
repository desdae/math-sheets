import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LeaderboardView from "../views/LeaderboardView.vue";
import { useAuthStore } from "../stores/auth";

const apiFetchMock = vi.fn();

vi.mock("../lib/api", () => ({
  authTokenStorageKey: "mathsheets.access_token",
  setStoredToken: vi.fn(),
  apiFetch: (...args: unknown[]) => apiFetchMock(...args)
}));

describe("LeaderboardView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiFetchMock.mockReset();
  });

  it("shows current user rank summary when signed in", async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: "user-1",
      email: "kid@example.com",
      publicNickname: "des"
    };

    apiFetchMock.mockResolvedValue({
      leaderboard: [
        {
          public_nickname: "des",
          worksheets_completed: 1,
          problems_solved: 12,
          correct_answers: 1,
          accuracy_percentage: 8.33
        }
      ]
    });

    const wrapper = mount(LeaderboardView);
    await flushPromises();

    expect(wrapper.text()).toContain("Your standing");
    expect(wrapper.text()).toContain("You are ranked #1");
  });
});
