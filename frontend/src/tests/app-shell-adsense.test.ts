import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import AppShell from "../components/layout/AppShell.vue";
import { createAcceptAllConsent, createRejectNonEssentialConsent, saveConsent } from "../lib/consent";
import { router } from "../router";

vi.mock("../lib/adsense", () => ({
  ensureAdsenseScript: vi.fn(async () => {}),
  resolveAdsenseConfig: () => ({
    enabled: true,
    clientId: "ca-pub-1234567890",
    inlineSlotId: "1234567890"
  }),
  canRenderAdsOnPath: (path: string) => ["/", "/privacy", "/terms", "/leaderboard"].includes(path)
}));

describe("AppShell AdSense gating", () => {
  beforeEach(async () => {
    localStorage.clear();
    setActivePinia(createPinia());
    (window as typeof window & { adsbygoogle?: unknown[] }).adsbygoogle = [];
    await router.push("/");
    await router.isReady();
  });

  it("shows the ad slot on approved public pages after advertising consent", async () => {
    saveConsent(createAcceptAllConsent("2026-04-20T10:00:00.000Z"));
    await router.push("/privacy");

    const wrapper = mount(AppShell, {
      global: {
        plugins: [router, createPinia()]
      },
      slots: {
        default: "<div>Page</div>"
      }
    });

    expect(wrapper.find('[data-testid="adsense-shell-slot"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Sponsored");
  });

  it("keeps ads hidden when advertising consent is rejected", async () => {
    saveConsent(createRejectNonEssentialConsent("2026-04-20T10:00:00.000Z"));
    await router.push("/privacy");

    const wrapper = mount(AppShell, {
      global: {
        plugins: [router, createPinia()]
      },
      slots: {
        default: "<div>Page</div>"
      }
    });

    expect(wrapper.find('[data-testid="adsense-shell-slot"]').exists()).toBe(false);
  });

  it("keeps ads off high-intent product pages even with advertising consent", async () => {
    saveConsent(createAcceptAllConsent("2026-04-20T10:00:00.000Z"));
    await router.push("/generate");

    const wrapper = mount(AppShell, {
      global: {
        plugins: [router, createPinia()]
      },
      slots: {
        default: "<div>Page</div>"
      }
    });

    expect(wrapper.find('[data-testid="adsense-shell-slot"]').exists()).toBe(false);
  });
});
