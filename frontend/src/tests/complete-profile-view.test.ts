import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CompleteProfileView from "../views/CompleteProfileView.vue";
import ProfileView from "../views/ProfileView.vue";
import { useAuthStore } from "../stores/auth";
import { useWorksheetStore } from "../stores/worksheet";

const push = vi.fn();
const apiFetchMock = vi.fn();
const setStoredTokenMock = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push
  })
}));

vi.mock("../lib/api", () => ({
  authTokenStorageKey: "mathsheets.access_token",
  setStoredToken: (...args: unknown[]) => setStoredTokenMock(...args),
  apiFetch: (...args: unknown[]) => apiFetchMock(...args)
}));

describe("CompleteProfileView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    push.mockReset();
    apiFetchMock.mockReset();
    setStoredTokenMock.mockReset();
  });

  it("saves a nickname and routes to the dashboard", async () => {
    const authStore = useAuthStore();
    const worksheetStore = useWorksheetStore();
    authStore.user = {
      id: "user-1",
      email: "kid@example.com",
      publicNickname: null
    };

    const fetchRemoteSpy = vi.spyOn(worksheetStore, "fetchRemoteWorksheets").mockResolvedValue();
    const promptImportSpy = vi.spyOn(worksheetStore, "maybePromptForImport").mockResolvedValue();
    apiFetchMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "kid@example.com",
        publicNickname: "Quiet Fox"
      }
    });

    const wrapper = mount(CompleteProfileView);
    await wrapper.get('[data-testid="nickname-input"]').setValue("Quiet Fox");
    await wrapper.get('[data-testid="nickname-submit"]').trigger("click");
    await flushPromises();

    expect(fetchRemoteSpy).toHaveBeenCalled();
    expect(promptImportSpy).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("updates the signed-in user's nickname from profile", async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: "user-1",
      email: "kid@example.com",
      publicNickname: "Quiet Fox"
    };

    apiFetchMock
      .mockResolvedValueOnce({
        worksheets_completed: 3,
        problems_solved: 24,
        correct_answers: 20,
        last_activity_date: "2026-04-13"
      })
      .mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "kid@example.com",
          publicNickname: "Brave Owl"
        }
      });

    const wrapper = mount(ProfileView);
    await flushPromises();
    await wrapper.get('[data-testid="profile-nickname-input"]').setValue("Brave Owl");
    await wrapper.get('[data-testid="profile-nickname-save"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Brave Owl");
  });
});
