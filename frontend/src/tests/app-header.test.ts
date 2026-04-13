import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import AppHeader from "../components/layout/AppHeader.vue";
import { useAuthStore } from "../stores/auth";

describe("AppHeader", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("shows the signed-in nickname and primary generate action", () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: "user-1",
      email: "kid@example.com",
      publicNickname: "Quiet Fox"
    };

    const wrapper = mount(AppHeader, {
      global: {
        stubs: {
          RouterLink: {
            props: ["to"],
            template: '<a :href="to"><slot /></a>'
          }
        }
      }
    });

    expect(wrapper.text()).toContain("Quiet Fox");
    expect(wrapper.text()).toContain("New worksheet");
    expect(wrapper.html()).toContain("/worksheets");
  });
});
