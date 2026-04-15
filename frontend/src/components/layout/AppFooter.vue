<template>
  <footer class="site-footer">
    <RouterLink class="site-footer-link" to="/privacy">Privacy Policy</RouterLink>
    <RouterLink class="site-footer-link" to="/terms">Terms of Service</RouterLink>
    <button
      class="site-footer-link site-footer-button"
      data-testid="open-consent-preferences"
      type="button"
      @click="$emit('open-consent')"
    >
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
