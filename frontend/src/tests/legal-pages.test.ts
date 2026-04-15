import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import AppShell from "../components/layout/AppShell.vue";
import { router } from "../router";

describe("legal routes and footer", () => {
  beforeEach(async () => {
    localStorage.clear();
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

  it("shows the banner on first visit and saves reject-non-essential choices", async () => {
    localStorage.clear();

    const wrapper = mount(AppShell, {
      global: {
        plugins: [router, createPinia()]
      },
      slots: {
        default: "<div>Page</div>"
      }
    });

    expect(wrapper.text()).toContain("Cookies and privacy choices");

    await wrapper.get('[data-testid="reject-non-essential"]').trigger("click");

    expect(localStorage.getItem("mathsheets-consent")).toContain('"analytics":false');
    expect(localStorage.getItem("mathsheets-consent")).toContain('"advertising":false');
  });

  it("reopens preferences from the footer and updates optional consent", async () => {
    localStorage.setItem(
      "mathsheets-consent",
      JSON.stringify({
        version: "2026-04-15",
        timestamp: "2026-04-15T10:00:00.000Z",
        necessary: true,
        anonymousMeasurement: true,
        analytics: false,
        advertising: false
      })
    );

    const wrapper = mount(AppShell, {
      global: {
        plugins: [router, createPinia()]
      },
      slots: {
        default: "<div>Page</div>"
      }
    });

    await wrapper.get('[data-testid="open-consent-preferences"]').trigger("click");
    await wrapper.get('input[name="analytics"]').setValue(true);
    await wrapper.get('[data-testid="save-consent-preferences"]').trigger("click");

    expect(localStorage.getItem("mathsheets-consent")).toContain('"analytics":true');
  });

  it("renders privacy and terms content sections", async () => {
    await router.push("/privacy");
    await router.isReady();

    const privacyWrapper = mount(
      { template: "<RouterView />" },
      {
        global: {
          plugins: [router, createPinia()]
        }
      }
    );

    expect(privacyWrapper.text()).toContain("Google sign-in");
    expect(privacyWrapper.text()).toContain("Cookies and browser storage");
    expect(privacyWrapper.text()).toContain("Advertising / personalization");

    await router.push("/terms");

    const termsWrapper = mount(
      { template: "<RouterView />" },
      {
        global: {
          plugins: [router, createPinia()]
        }
      }
    );

    expect(termsWrapper.text()).toContain("Acceptable use");
    expect(termsWrapper.text()).toContain("Availability and liability");
  });
});
