<template>
  <header class="site-header">
    <RouterLink class="brand" to="/">MathSheets</RouterLink>
    <nav class="site-nav">
      <RouterLink to="/generate">Generate</RouterLink>
      <RouterLink to="/worksheets">Saved</RouterLink>
      <RouterLink to="/leaderboard">Leaderboard</RouterLink>
      <RouterLink to="/profile">Profile</RouterLink>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>
