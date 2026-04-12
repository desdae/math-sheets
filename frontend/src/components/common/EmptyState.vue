<template>
  <section class="empty-state">
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();
</script>
