<template>
  <div v-if="open" class="modal-backdrop">
    <section class="modal-card consent-modal">
      <h2>Privacy & cookies</h2>
      <p class="muted-copy">
        Necessary cookies and anonymous measurement stay on so the app can work reliably. Optional analytics and advertising
        features depend on your choices.
      </p>
      <label class="consent-option">
        <input checked disabled type="checkbox" />
        <span>
          <strong>Necessary</strong>
          <small>Required for security, sign-in, and core app functionality.</small>
        </span>
      </label>
      <label class="consent-option">
        <input checked disabled type="checkbox" />
        <span>
          <strong>Anonymous measurement</strong>
          <small>Basic product measurement that does not turn on optional analytics or ads.</small>
        </span>
      </label>
      <label class="consent-option">
        <input v-model="analytics" name="analytics" type="checkbox" />
        <span>
          <strong>Analytics</strong>
          <small>Helps improve the product with optional usage insights.</small>
        </span>
      </label>
      <label class="consent-option">
        <input v-model="advertising" name="advertising" type="checkbox" />
        <span>
          <strong>Advertising / personalization</strong>
          <small>Allows unobtrusive Google AdSense placements on public pages after you opt in.</small>
        </span>
      </label>
      <RouterLink class="text-link" to="/privacy" @click="$emit('close')">Read the Privacy Policy</RouterLink>
      <div class="modal-actions">
        <button class="button button-secondary" type="button" @click="$emit('close')">Cancel</button>
        <button class="button" data-testid="save-consent-preferences" type="button" @click="savePreferences">
          Save preferences
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { RouterLink } from "vue-router";
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

function savePreferences() {
  emit("save", { analytics: analytics.value, advertising: advertising.value });
}
</script>
