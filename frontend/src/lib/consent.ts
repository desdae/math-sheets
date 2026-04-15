export const CONSENT_STORAGE_KEY = "mathsheets-consent";
export const CONSENT_VERSION = "2026-04-15";

export type ConsentState = {
  version: string;
  timestamp: string;
  necessary: true;
  anonymousMeasurement: true;
  analytics: boolean;
  advertising: boolean;
};

function isConsentState(value: unknown): value is ConsentState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.version === CONSENT_VERSION &&
    typeof candidate.timestamp === "string" &&
    candidate.necessary === true &&
    candidate.anonymousMeasurement === true &&
    typeof candidate.analytics === "boolean" &&
    typeof candidate.advertising === "boolean"
  );
}

export function createRejectNonEssentialConsent(timestamp = new Date().toISOString()): ConsentState {
  return {
    version: CONSENT_VERSION,
    timestamp,
    necessary: true,
    anonymousMeasurement: true,
    analytics: false,
    advertising: false
  };
}

export function createAcceptAllConsent(timestamp = new Date().toISOString()): ConsentState {
  return {
    ...createRejectNonEssentialConsent(timestamp),
    analytics: true,
    advertising: true
  };
}

export function getStoredConsent(): ConsentState | null {
  const rawValue = localStorage.getItem(CONSENT_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return isConsentState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveConsent(consent: ConsentState) {
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
}

export function needsConsentPrompt() {
  return getStoredConsent() === null;
}
