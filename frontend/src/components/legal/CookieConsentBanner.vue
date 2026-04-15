<template>
  <section v-if="visible" class="consent-banner" data-testid="cookie-consent-banner">
    <div class="consent-banner-copy">
      <p class="eyebrow">Privacy</p>
      <h2>Cookies and privacy choices</h2>
      <p>
        MathSheets uses necessary cookies and browser storage for sign-in and saved progress. Analytics and advertising
        features depend on your choices.
      </p>
      <RouterLink class="text-link" to="/privacy">Read the Privacy Policy</RouterLink>
    </div>
    <div class="consent-banner-actions">
      <button class="button button-secondary" data-testid="reject-non-essential" type="button" @click="$emit('reject')">
        Reject non-essential
      </button>
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
