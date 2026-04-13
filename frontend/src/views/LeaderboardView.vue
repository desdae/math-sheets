<template>
  <section data-testid="leaderboard-page" class="page-stack">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Leaderboard</p>
        <h1>Top users</h1>
      </div>
    </div>

    <LeaderboardSummaryCard
      :rank="currentUserRank"
      :metric="leaderboardStore.metric"
      :is-ranked="currentUserRank > 0"
      :requires-threshold="leaderboardStore.metric === 'accuracy'"
    />

    <div class="card toolbar">
      <label>
        Period
        <select v-model="leaderboardStore.period" @change="leaderboardStore.fetchLeaderboard()">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </label>

      <label>
        Metric
        <select v-model="leaderboardStore.metric" @change="leaderboardStore.fetchLeaderboard()">
          <option value="worksheets">Worksheets</option>
          <option value="problems">Problems</option>
          <option value="accuracy">Accuracy</option>
        </select>
      </label>
    </div>

    <LeaderboardTable
      :rows="leaderboardStore.rows"
      :current-user-nickname="authStore.user?.publicNickname ?? null"
      :is-loading="leaderboardStore.isLoading"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import LeaderboardSummaryCard from "../components/leaderboard/LeaderboardSummaryCard.vue";
import LeaderboardTable from "../components/leaderboard/LeaderboardTable.vue";
import { findCurrentUserRank } from "../lib/leaderboard";
import { useAuthStore } from "../stores/auth";
import { useLeaderboardStore } from "../stores/leaderboard";

const authStore = useAuthStore();
const leaderboardStore = useLeaderboardStore();
const currentUserRank = computed(() =>
  findCurrentUserRank(leaderboardStore.rows, authStore.user?.publicNickname)
);

onMounted(() => {
  leaderboardStore.fetchLeaderboard();
});
</script>
