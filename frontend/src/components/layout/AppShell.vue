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
