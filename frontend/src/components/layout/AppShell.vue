<template>
  <div class="app-shell">
    <AppHeader />
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from "./AppHeader.vue";
</script>
