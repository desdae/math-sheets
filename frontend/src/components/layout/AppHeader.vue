<template>
  <header class="site-header">
    <RouterLink class="brand" to="/">MathSheets</RouterLink>
    <nav class="site-nav">
      <RouterLink class="site-nav-link" active-class="site-nav-link-active" to="/generate">Generate</RouterLink>
      <RouterLink class="site-nav-link" active-class="site-nav-link-active" to="/worksheets">Saved</RouterLink>
      <RouterLink class="site-nav-link" active-class="site-nav-link-active" to="/leaderboard">Leaderboard</RouterLink>
      <RouterLink class="site-nav-link" active-class="site-nav-link-active" to="/profile">Profile</RouterLink>
    </nav>
    <div class="site-header-actions">
      <span v-if="authStore.user" class="site-header-user">{{ authStore.user.publicNickname }}</span>
      <RouterLink class="button site-header-cta" to="/generate">New worksheet</RouterLink>
    </div>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useAuthStore } from "../../stores/auth";

const authStore = useAuthStore();
</script>
