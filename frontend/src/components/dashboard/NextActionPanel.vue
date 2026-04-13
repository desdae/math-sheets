<template>
  <section class="dashboard-next-action">
    <div class="dashboard-next-action-copy">
      <p class="eyebrow">{{ eyebrow }}</p>
      <h2>{{ title }}</h2>
      <p class="lede">{{ description }}</p>
    </div>
    <RouterLink data-testid="dashboard-primary-action" class="button" :to="to">
      {{ cta }}
    </RouterLink>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";

defineProps<{
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  to: string;
}>();
</script>
