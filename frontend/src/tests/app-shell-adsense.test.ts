import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import AppShell from "../components/layout/AppShell.vue";
import { createAcceptAllConsent, createRejectNonEssentialConsent, saveConsent } from "../lib/consent";
import { router } from "../router";

const ensureAdsenseScriptMock = vi.fn(async () => {});

vi.mock("../lib/adsense", () => ({
  ensureAdsenseScript: (...args: unknown[]) => ensureAdsenseScriptMock(...args),
  resolveAdsenseConfig: () => ({
    enabled: true,
    clientId: "ca-pub-1234567890"
  })
}));

describe("AppShell AdSense gating", () => {
  beforeEach(async () => {
    localStorage.clear();
    setActivePinia(createPinia());
    ensureAdsenseScriptMock.mockReset();
    await router.push("/");
    await router.isReady();
  });

  it("loads the AdSense script after advertising consent is granted", async () => {
    saveConsent(createAcceptAllConsent("2026-04-20T10:00:00.000Z"));
    await router.push("/privacy");

    mount(AppShell, {
      global: {
        plugins: [router, createPinia()]
      },
      slots: {
        default: "<div>Page</div>"
      }
    });

    expect(ensureAdsenseScriptMock).toHaveBeenCalledWith("ca-pub-1234567890");
  });

  it("does not load AdSense when advertising consent is rejected", async () => {
    saveConsent(createRejectNonEssentialConsent("2026-04-20T10:00:00.000Z"));
    await router.push("/privacy");

    mount(AppShell, {
      global: {
        plugins: [router, createPinia()]
      },
      slots: {
        default: "<div>Page</div>"
      }
    });

    expect(ensureAdsenseScriptMock).not.toHaveBeenCalled();
  });

  it("does not load AdSense before a consent choice exists", async () => {
    localStorage.clear();
    await router.push("/privacy");

    mount(AppShell, {
      global: {
        plugins: [router, createPinia()]
      },
      slots: {
        default: "<div>Page</div>"
      }
    });

    expect(ensureAdsenseScriptMock).not.toHaveBeenCalled();
  });
});
