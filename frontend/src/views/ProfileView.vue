<template>
  <section data-testid="profile-page" class="page-stack">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Profile</p>
        <h1>{{ authStore.user?.displayName ?? "Anonymous user" }}</h1>
      </div>
      <button v-if="authStore.user" class="button button-secondary" @click="authStore.logout()">Log out</button>
    </div>

    <div v-if="authStore.user && stats" class="stat-grid">
      <StatCard label="Worksheets completed" :value="stats.worksheets_completed" />
      <StatCard label="Problems solved" :value="stats.problems_solved" />
      <StatCard label="Correct answers" :value="stats.correct_answers" />
      <StatCard label="Last activity" :value="formatDate(stats.last_activity_date)" />
    </div>

    <div v-else class="card">
      <p>Sign in with Google to sync history, unlock statistics, and appear on leaderboards.</p>
      <button class="button" @click="authStore.startGoogleSignIn()">Continue with Google</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import StatCard from "../components/common/StatCard.vue";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/format";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const stats = ref<Record<string, string | number> | null>(null);

onMounted(async () => {
  if (authStore.user) {
    stats.value = await apiFetch("/users/me/stats");
  }
});
</script>
