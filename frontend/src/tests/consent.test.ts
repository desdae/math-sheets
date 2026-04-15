import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  createAcceptAllConsent,
  createRejectNonEssentialConsent,
  getStoredConsent,
  needsConsentPrompt,
  saveConsent
} from "../lib/consent";

describe("consent storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("returns null when nothing is stored", () => {
    expect(getStoredConsent()).toBeNull();
    expect(needsConsentPrompt()).toBe(true);
  });

  it("stores reject-non-essential choices with current version", () => {
    saveConsent(createRejectNonEssentialConsent("2026-04-15T10:00:00.000Z"));

    expect(getStoredConsent()).toEqual({
      version: CONSENT_VERSION,
      timestamp: "2026-04-15T10:00:00.000Z",
      necessary: true,
      anonymousMeasurement: true,
      analytics: false,
      advertising: false
    });
  });

  it("stores accept-all choices with optional categories enabled", () => {
    saveConsent(createAcceptAllConsent("2026-04-15T10:00:00.000Z"));

    expect(getStoredConsent()?.analytics).toBe(true);
    expect(getStoredConsent()?.advertising).toBe(true);
    expect(needsConsentPrompt()).toBe(false);
  });

  it("re-prompts when stored version is outdated", () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: "2026-01-01",
        timestamp: "2026-01-01T00:00:00.000Z",
        necessary: true,
        anonymousMeasurement: true,
        analytics: false,
        advertising: false
      })
    );

    expect(needsConsentPrompt()).toBe(true);
  });

  it("ignores malformed storage safely", () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "{broken");

    expect(getStoredConsent()).toBeNull();
    expect(needsConsentPrompt()).toBe(true);
  });
});
