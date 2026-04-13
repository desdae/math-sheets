<template>
  <div class="worksheet-completion-actions">
    <RouterLink class="button button-secondary" to="/worksheets">Back to library</RouterLink>
    <RouterLink class="button" to="/generate">Generate another</RouterLink>
    <RouterLink v-if="showLeaderboardLink" class="button button-secondary" to="/leaderboard">See leaderboard</RouterLink>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useAuthStore } from "../../stores/auth";

const authStore = useAuthStore();
const showLeaderboardLink = computed(() => Boolean(authStore.user));
</script>
