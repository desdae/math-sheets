import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import AppShell from "../components/layout/AppShell.vue";
import { router } from "../router";

describe("legal routes and footer", () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await router.push("/privacy");
    await router.isReady();
  });

  it("renders the privacy policy route and footer links", async () => {
    const wrapper = mount(AppShell, {
      global: {
        plugins: [router, createPinia()],
        stubs: { RouterView: { template: "<div />" } }
      },
      slots: {
        default: "<RouterView />"
      }
    });

    expect(router.getRoutes().some((route) => route.path === "/privacy")).toBe(true);
    expect(router.getRoutes().some((route) => route.path === "/terms")).toBe(true);
    expect(wrapper.text()).toContain("Privacy Policy");
    expect(wrapper.text()).toContain("Terms of Service");
    expect(wrapper.text()).toContain("Privacy & cookies");
  });
});
