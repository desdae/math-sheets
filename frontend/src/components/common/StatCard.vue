<template>
  <article class="stat-card">
    <p class="stat-label">{{ label }}</p>
    <strong class="stat-value">{{ value }}</strong>
    <p v-if="hint" class="stat-hint">{{ hint }}</p>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
  hint?: string;
}>();
</script>
