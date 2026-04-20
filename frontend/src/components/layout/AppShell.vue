<template>
  <div class="app-shell">
    <AppHeader />
    <main class="app-main">
      <slot />
    </main>
    <AdSenseInline
      v-if="showAdSlot"
      :active="showAdSlot"
      :ad-client="adsenseConfig.clientId"
      :slot-id="adsenseConfig.inlineSlotId"
    />
    <AppFooter @open-consent="isConsentPreferencesOpen = true" />
    <CookieConsentBanner
      :visible="showConsentBanner"
      @accept="acceptAll"
      @manage="isConsentPreferencesOpen = true"
      @reject="rejectNonEssential"
    />
    <CookiePreferencesModal
      :consent="consent"
      :open="isConsentPreferencesOpen"
      @close="isConsentPreferencesOpen = false"
      @save="savePreferences"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { canRenderAdsOnPath, resolveAdsenseConfig } from "../../lib/adsense";
import {
  createAcceptAllConsent,
  createRejectNonEssentialConsent,
  getStoredConsent,
  saveConsent,
  type ConsentState
} from "../../lib/consent";
import AdSenseInline from "../ads/AdSenseInline.vue";
import CookieConsentBanner from "../legal/CookieConsentBanner.vue";
import CookiePreferencesModal from "../legal/CookiePreferencesModal.vue";
import AppFooter from "./AppFooter.vue";
import AppHeader from "./AppHeader.vue";

const route = useRoute();
const isConsentPreferencesOpen = ref(false);
const consent = ref<ConsentState | null>(getStoredConsent());
const showConsentBanner = computed(() => consent.value === null && !isConsentPreferencesOpen.value);
const adsenseConfig = resolveAdsenseConfig();
const showAdSlot = computed(
  () => adsenseConfig.enabled && consent.value?.advertising === true && canRenderAdsOnPath(route.path)
);

function refreshConsentState() {
  consent.value = getStoredConsent();
}

function acceptAll() {
  saveConsent(createAcceptAllConsent());
  refreshConsentState();
}

function rejectNonEssential() {
  saveConsent(createRejectNonEssentialConsent());
  refreshConsentState();
}

function savePreferences(selection: { analytics: boolean; advertising: boolean }) {
  saveConsent({
    ...(consent.value ?? createRejectNonEssentialConsent()),
    analytics: selection.analytics,
    advertising: selection.advertising,
    timestamp: new Date().toISOString()
  });
  refreshConsentState();
  isConsentPreferencesOpen.value = false;
}
</script>
