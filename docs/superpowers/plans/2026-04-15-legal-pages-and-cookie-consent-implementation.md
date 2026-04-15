# Legal Pages and Cookie Consent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public Privacy Policy and Terms pages plus a versioned frontend-only cookie consent flow with reusable preferences controls and always-available legal links.

**Architecture:** Keep the whole feature in the Vue frontend. A small consent utility/store owns the versioned local-storage record and permission helpers, the router exposes public legal routes, and `AppShell` hosts the banner, preferences modal, and footer links so consent and legal access stay global.

**Tech Stack:** Vue 3, Vue Router, Pinia-style frontend stores/utilities, Vitest, Playwright, existing MathSheets CSS system

---

## File Structure

**Create**

- `frontend/src/lib/consent.ts` - versioned consent storage, parsing, defaults, permission helpers
- `frontend/src/components/legal/CookieConsentBanner.vue` - first-visit banner with accept/reject/manage actions
- `frontend/src/components/legal/CookiePreferencesModal.vue` - reusable preferences editor for later changes
- `frontend/src/components/layout/AppFooter.vue` - legal links and consent-management entry point
- `frontend/src/views/PrivacyPolicyView.vue` - public privacy page with cookie/storage details
- `frontend/src/views/TermsView.vue` - public terms page
- `frontend/src/tests/consent.test.ts` - unit tests for consent parsing/versioning/storage
- `frontend/src/tests/legal-pages.test.ts` - route/render tests for privacy/terms/footer/banner shell integration
- `e2e/specs/routes/legal-pages.spec.ts` - browser coverage for consent banner and legal navigation

**Modify**

- `frontend/src/router/index.ts` - add `/privacy` and `/terms`
- `frontend/src/App.vue` - initialize consent state on app load if needed
- `frontend/src/components/layout/AppShell.vue` - host footer, banner, and preferences modal
- `frontend/src/components/layout/AppHeader.vue` - keep header layout stable if footer/legal routes affect navigation tests
- `frontend/src/styles/main.css` - legal page typography, footer, banner, modal styles
- `README.md` - mention legal routes and client-side consent behavior
- `docs/pre-launch-checklist.md` - mark legal pages/consent status accurately if needed

**Likely unchanged but relevant**

- `frontend/src/stores/auth.ts`
- `frontend/src/tests/app-header.test.ts`
- `frontend/src/tests/api.test.ts`

---

### Task 1: Build Versioned Consent Storage

**Files:**
- Create: `frontend/src/lib/consent.ts`
- Test: `frontend/src/tests/consent.test.ts`

- [ ] **Step 1: Write the failing consent unit tests**

```ts
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
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run: `npm run test --workspace frontend -- src/tests/consent.test.ts`

Expected: FAIL with module/file-not-found errors for `../lib/consent`

- [ ] **Step 3: Implement minimal consent utility**

```ts
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
```

- [ ] **Step 4: Run the consent tests to verify they pass**

Run: `npm run test --workspace frontend -- src/tests/consent.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/consent.ts frontend/src/tests/consent.test.ts
git commit -m "feat: add consent storage utility"
```

---

### Task 2: Add Public Legal Pages and Footer Links

**Files:**
- Create: `frontend/src/components/layout/AppFooter.vue`
- Create: `frontend/src/views/PrivacyPolicyView.vue`
- Create: `frontend/src/views/TermsView.vue`
- Modify: `frontend/src/router/index.ts`
- Modify: `frontend/src/components/layout/AppShell.vue`
- Test: `frontend/src/tests/legal-pages.test.ts`

- [ ] **Step 1: Write the failing legal-pages route test**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
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
```

- [ ] **Step 2: Run the legal-pages test to verify it fails**

Run: `npm run test --workspace frontend -- src/tests/legal-pages.test.ts`

Expected: FAIL because the routes/components/footer do not exist yet

- [ ] **Step 3: Add the router entries and legal page shells**

```ts
// frontend/src/router/index.ts
{ path: "/privacy", component: () => import("../views/PrivacyPolicyView.vue") },
{ path: "/terms", component: () => import("../views/TermsView.vue") }
```

```vue
<!-- frontend/src/views/PrivacyPolicyView.vue -->
<template>
  <section class="legal-page">
    <p class="eyebrow">Privacy</p>
    <h1>Privacy Policy</h1>
    <p class="legal-intro">
      MathSheets stores account, worksheet, and browser data to run the app safely and let learners continue their work.
    </p>
    <section class="legal-section">
      <h2>Information we collect</h2>
      <p>MathSheets may store your email address for account access, your public nickname for leaderboards, worksheet history, saved answers, local browser worksheets, and consent preferences.</p>
    </section>
    <section class="legal-section">
      <h2>Cookies and browser storage</h2>
      <p>Necessary cookies keep sign-in and security working. Anonymous measurement may be enabled by default. Optional analytics and advertising features remain off until you consent.</p>
    </section>
  </section>
</template>
```

```vue
<!-- frontend/src/views/TermsView.vue -->
<template>
  <section class="legal-page">
    <p class="eyebrow">Terms</p>
    <h1>Terms of Service</h1>
    <p class="legal-intro">
      By using MathSheets, you agree to use the service responsibly and understand that availability, features, and policies may change over time.
    </p>
    <section class="legal-section">
      <h2>Acceptable use</h2>
      <p>Do not misuse the service, attempt to disrupt other users, or abuse sign-in, leaderboard, or worksheet features.</p>
    </section>
    <section class="legal-section">
      <h2>Availability and liability</h2>
      <p>MathSheets is provided as-is without a guarantee of uninterrupted service, and liability is limited to the maximum extent allowed by law.</p>
    </section>
  </section>
</template>
```

- [ ] **Step 4: Add the footer to the shared shell**

```vue
<!-- frontend/src/components/layout/AppFooter.vue -->
<template>
  <footer class="site-footer">
    <RouterLink class="site-footer-link" to="/privacy">Privacy Policy</RouterLink>
    <RouterLink class="site-footer-link" to="/terms">Terms of Service</RouterLink>
    <button class="site-footer-link site-footer-button" type="button" @click="$emit('open-consent')">
      Privacy & cookies
    </button>
  </footer>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";

defineEmits<{
  (event: "open-consent"): void;
}>();
</script>
```

```vue
<!-- frontend/src/components/layout/AppShell.vue -->
<template>
  <div class="app-shell">
    <AppHeader />
    <main class="app-main">
      <slot />
    </main>
    <AppFooter @open-consent="isConsentPreferencesOpen = true" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import AppFooter from "./AppFooter.vue";
import AppHeader from "./AppHeader.vue";

const isConsentPreferencesOpen = ref(false);
</script>
```

- [ ] **Step 5: Run the legal-pages test to verify it passes**

Run: `npm run test --workspace frontend -- src/tests/legal-pages.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/router/index.ts frontend/src/components/layout/AppShell.vue frontend/src/components/layout/AppFooter.vue frontend/src/views/PrivacyPolicyView.vue frontend/src/views/TermsView.vue frontend/src/tests/legal-pages.test.ts
git commit -m "feat: add legal pages and footer links"
```

---

### Task 3: Add Global Consent Banner and Preferences Modal

**Files:**
- Create: `frontend/src/components/legal/CookieConsentBanner.vue`
- Create: `frontend/src/components/legal/CookiePreferencesModal.vue`
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/components/layout/AppShell.vue`
- Modify: `frontend/src/styles/main.css`
- Test: `frontend/src/tests/legal-pages.test.ts`

- [ ] **Step 1: Extend the test to cover first-visit consent behavior**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace frontend -- src/tests/legal-pages.test.ts`

Expected: FAIL because the banner and modal do not exist yet

- [ ] **Step 3: Implement the consent banner and preferences modal**

```vue
<!-- frontend/src/components/legal/CookieConsentBanner.vue -->
<template>
  <section v-if="visible" class="consent-banner" data-testid="cookie-consent-banner">
    <div>
      <p class="eyebrow">Privacy</p>
      <h2>Cookies and privacy choices</h2>
      <p>
        MathSheets uses necessary cookies and browser storage for sign-in and saved progress. Analytics and advertising features depend on your choices.
      </p>
      <RouterLink class="text-link" to="/privacy">Read the Privacy Policy</RouterLink>
    </div>
    <div class="consent-banner-actions">
      <button class="button button-secondary" data-testid="reject-non-essential" type="button" @click="$emit('reject')">Reject non-essential</button>
      <button class="button button-secondary" type="button" @click="$emit('manage')">Manage preferences</button>
      <button class="button" type="button" @click="$emit('accept')">Accept all</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";

defineProps<{ visible: boolean }>();
defineEmits<{
  (event: "accept"): void;
  (event: "reject"): void;
  (event: "manage"): void;
}>();
</script>
```

```vue
<!-- frontend/src/components/legal/CookiePreferencesModal.vue -->
<template>
  <div v-if="open" class="consent-modal-backdrop">
    <section class="consent-modal">
      <h2>Privacy & cookies</h2>
      <label><input checked disabled type="checkbox" /> Necessary</label>
      <label><input checked disabled type="checkbox" /> Anonymous measurement</label>
      <label><input v-model="analytics" name="analytics" type="checkbox" /> Analytics</label>
      <label><input v-model="advertising" name="advertising" type="checkbox" /> Advertising / personalization</label>
      <div class="consent-modal-actions">
        <button class="button button-secondary" type="button" @click="$emit('close')">Cancel</button>
        <button class="button" data-testid="save-consent-preferences" type="button" @click="save">Save preferences</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { ConsentState } from "../../lib/consent";

const props = defineProps<{
  open: boolean;
  consent: ConsentState | null;
}>();

const emit = defineEmits<{
  (event: "save", value: { analytics: boolean; advertising: boolean }): void;
  (event: "close"): void;
}>();

const analytics = ref(false);
const advertising = ref(false);

watch(
  () => props.consent,
  (value) => {
    analytics.value = value?.analytics ?? false;
    advertising.value = value?.advertising ?? false;
  },
  { immediate: true }
);

function save() {
  emit("save", { analytics: analytics.value, advertising: advertising.value });
}
</script>
```

- [ ] **Step 4: Wire the shell to the consent utility**

```vue
<!-- key excerpts from frontend/src/components/layout/AppShell.vue -->
<script setup lang="ts">
import { computed, ref } from "vue";
import CookieConsentBanner from "../legal/CookieConsentBanner.vue";
import CookiePreferencesModal from "../legal/CookiePreferencesModal.vue";
import {
  createAcceptAllConsent,
  createRejectNonEssentialConsent,
  getStoredConsent,
  needsConsentPrompt,
  saveConsent
} from "../../lib/consent";

const consent = ref(getStoredConsent());
const isConsentPreferencesOpen = ref(false);
const showConsentBanner = computed(() => needsConsentPrompt() && !isConsentPreferencesOpen.value);

function refreshConsent() {
  consent.value = getStoredConsent();
}

function acceptAll() {
  saveConsent(createAcceptAllConsent());
  refreshConsent();
}

function rejectNonEssential() {
  saveConsent(createRejectNonEssentialConsent());
  refreshConsent();
}

function savePreferences(selection: { analytics: boolean; advertising: boolean }) {
  saveConsent({
    ...(consent.value ?? createRejectNonEssentialConsent()),
    analytics: selection.analytics,
    advertising: selection.advertising,
    timestamp: new Date().toISOString()
  });
  refreshConsent();
  isConsentPreferencesOpen.value = false;
}
</script>
```

- [ ] **Step 5: Add the supporting styles**

```css
.site-footer {
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding: 1.5rem 2rem 2.5rem;
  border-top: 1px solid rgba(24, 35, 61, 0.08);
}

.consent-banner {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 40;
  max-width: 34rem;
  padding: 1.25rem;
  border: 1px solid rgba(214, 100, 55, 0.22);
  border-radius: 1.5rem;
  background: rgba(255, 250, 243, 0.98);
  box-shadow: 0 18px 40px rgba(32, 24, 18, 0.12);
}

.consent-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(18, 24, 38, 0.35);
}

.legal-page {
  width: min(840px, calc(100vw - 3rem));
  margin: 0 auto;
  padding: 3rem 0 4rem;
}
```

- [ ] **Step 6: Run the legal-pages tests to verify they pass**

Run: `npm run test --workspace frontend -- src/tests/legal-pages.test.ts src/tests/consent.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/legal/CookieConsentBanner.vue frontend/src/components/legal/CookiePreferencesModal.vue frontend/src/components/layout/AppShell.vue frontend/src/styles/main.css frontend/src/tests/legal-pages.test.ts frontend/src/lib/consent.ts frontend/src/tests/consent.test.ts
git commit -m "feat: add cookie consent flow"
```

---

### Task 4: Finish Real Legal Content and Wire Documentation

**Files:**
- Modify: `frontend/src/views/PrivacyPolicyView.vue`
- Modify: `frontend/src/views/TermsView.vue`
- Modify: `README.md`
- Modify: `docs/pre-launch-checklist.md`
- Test: `frontend/src/tests/legal-pages.test.ts`

- [ ] **Step 1: Add assertions for meaningful legal copy**

```ts
it("renders privacy and terms content sections", async () => {
  await router.push("/privacy");
  await router.isReady();

  const privacyWrapper = mount({ template: "<RouterView />" }, { global: { plugins: [router, createPinia()] } });
  expect(privacyWrapper.text()).toContain("Google sign-in");
  expect(privacyWrapper.text()).toContain("Cookies and browser storage");
  expect(privacyWrapper.text()).toContain("Advertising / personalization");

  await router.push("/terms");
  const termsWrapper = mount({ template: "<RouterView />" }, { global: { plugins: [router, createPinia()] } });
  expect(termsWrapper.text()).toContain("Acceptable use");
  expect(termsWrapper.text()).toContain("Availability and liability");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace frontend -- src/tests/legal-pages.test.ts`

Expected: FAIL because the legal copy is still only a minimal shell

- [ ] **Step 3: Expand the policy pages into realistic draft documents**

```vue
<!-- key excerpt for frontend/src/views/PrivacyPolicyView.vue -->
<section class="legal-section">
  <h2>Google sign-in and account data</h2>
  <p>
    If you sign in with Google, MathSheets uses your Google account only to authenticate you and keep your account secure.
    Public app surfaces use your chosen public nickname instead of your Google profile name.
  </p>
</section>
<section class="legal-section">
  <h2>Cookies and browser storage</h2>
  <p>
    MathSheets uses necessary cookies for authentication and security, local browser storage for anonymous worksheet progress,
    and a versioned consent record so your privacy choices can be remembered.
  </p>
</section>
<section class="legal-section">
  <h2>Analytics and advertising choices</h2>
  <p>
    Anonymous measurement may be enabled by default. Optional analytics and advertising or personalization tools remain off
    unless you explicitly allow them through the consent controls.
  </p>
</section>
```

```vue
<!-- key excerpt for frontend/src/views/TermsView.vue -->
<section class="legal-section">
  <h2>Acceptable use</h2>
  <p>
    You may not misuse MathSheets, interfere with other users, automate abusive traffic, or attempt to bypass account,
    worksheet, or leaderboard protections.
  </p>
</section>
<section class="legal-section">
  <h2>Availability and liability</h2>
  <p>
    MathSheets is provided on an as-is basis. We may change or pause the service, and we do not guarantee uninterrupted
    access or error-free operation.
  </p>
</section>
```

- [ ] **Step 4: Update the documentation**

```md
<!-- README.md -->
## Legal and privacy

- Public legal routes are available at `/privacy` and `/terms`.
- Cookie and storage preferences are managed in-app through the `Privacy & cookies` controls.
- Consent choices are stored locally in the browser and re-requested when the consent version changes.
```

```md
<!-- docs/pre-launch-checklist.md -->
- [x] Add Privacy Policy
- [x] Add Terms of Service
- [x] Add client-side consent controls for non-essential cookies
- [ ] Review final legal text with your own legal/business requirements before public launch
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test --workspace frontend -- src/tests/legal-pages.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/PrivacyPolicyView.vue frontend/src/views/TermsView.vue README.md docs/pre-launch-checklist.md frontend/src/tests/legal-pages.test.ts
git commit -m "docs: add legal policy content"
```

---

### Task 5: Add Browser-Level Verification

**Files:**
- Create: `e2e/specs/routes/legal-pages.spec.ts`
- Test: `e2e/specs/routes/legal-pages.spec.ts`

- [ ] **Step 1: Write the failing Playwright spec**

```ts
import { test, expect } from "../../fixtures/base";

test("first visit shows consent banner and legal pages are reachable", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("cookie-consent-banner")).toBeVisible();
  await page.getByRole("link", { name: "Read the Privacy Policy" }).click();
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();

  await page.goto("/");
  await page.getByTestId("reject-non-essential").click();
  await expect(page.getByTestId("cookie-consent-banner")).toBeHidden();

  await page.getByRole("button", { name: /privacy & cookies/i }).click();
  await expect(page.getByRole("heading", { name: /privacy & cookies/i })).toBeVisible();
});
```

- [ ] **Step 2: Run the Playwright spec to verify it fails**

Run: `npm run test:e2e -- e2e/specs/routes/legal-pages.spec.ts`

Expected: FAIL because the consent UI and legal routes are not fully wired in the browser yet

- [ ] **Step 3: Implement any missing data-testid or accessibility hooks**

```vue
<!-- examples to keep if browser selectors need them -->
<section class="consent-banner" data-testid="cookie-consent-banner">
<button data-testid="reject-non-essential" type="button">Reject non-essential</button>
<button data-testid="open-consent-preferences" type="button">Privacy & cookies</button>
```

- [ ] **Step 4: Run the Playwright spec to verify it passes**

Run: `npm run test:e2e -- e2e/specs/routes/legal-pages.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add e2e/specs/routes/legal-pages.spec.ts frontend/src/components/legal/CookieConsentBanner.vue frontend/src/components/layout/AppFooter.vue frontend/src/components/legal/CookiePreferencesModal.vue
git commit -m "test: cover legal pages and consent flow"
```

---

### Task 6: Final Verification

**Files:**
- Verify only

- [ ] **Step 1: Run the frontend unit tests for this feature**

Run: `npm run test --workspace frontend -- src/tests/consent.test.ts src/tests/legal-pages.test.ts src/tests/app-header.test.ts`

Expected: PASS

- [ ] **Step 2: Run the frontend build**

Run: `npm run build --workspace frontend`

Expected: PASS

- [ ] **Step 3: Run the Playwright legal-pages spec**

Run: `npm run test:e2e -- e2e/specs/routes/legal-pages.spec.ts`

Expected: PASS

- [ ] **Step 4: Review the README and pre-launch checklist diff**

Run: `git diff -- README.md docs/pre-launch-checklist.md`

Expected: The docs reflect the new legal routes and consent controls without contradicting existing release guidance

- [ ] **Step 5: Commit any final cleanup**

```bash
git add frontend/src/components/legal/CookieConsentBanner.vue frontend/src/components/legal/CookiePreferencesModal.vue frontend/src/components/layout/AppFooter.vue frontend/src/components/layout/AppShell.vue frontend/src/views/PrivacyPolicyView.vue frontend/src/views/TermsView.vue frontend/src/router/index.ts frontend/src/lib/consent.ts frontend/src/styles/main.css frontend/src/tests/consent.test.ts frontend/src/tests/legal-pages.test.ts e2e/specs/routes/legal-pages.spec.ts README.md docs/pre-launch-checklist.md
git commit -m "chore: finish legal and consent rollout"
```

---

## Self-Review

**Spec coverage**

- Public privacy route: Task 2 and Task 4
- Public terms route: Task 2 and Task 4
- Global banner: Task 3
- Preferences panel: Task 3
- Consent versioning and storage: Task 1
- Footer/legal reopen links: Task 2 and Task 3
- Frontend-only storage: Task 1
- README/checklist updates: Task 4
- Frontend and browser tests: Tasks 1, 2, 3, 5, 6

No spec gaps remain.

**Placeholder scan**

- Removed generic “implement later” language
- Every code-changing task includes concrete file paths and example code
- Every test step has an exact command and expected result

**Type consistency**

- Consent model stays on `version`, `timestamp`, `necessary`, `anonymousMeasurement`, `analytics`, `advertising`
- Storage key remains `mathsheets-consent`
- Footer reopen action stays `open-consent`
- Banner selector names stay aligned with the Playwright/unit tests
