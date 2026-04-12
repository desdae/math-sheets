<template>
  <section data-testid="leaderboard-page" class="page-stack">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Leaderboard</p>
        <h1>Top users</h1>
      </div>
    </div>

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

    <LeaderboardTable :rows="leaderboardStore.rows" />
  </section>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import LeaderboardTable from "../components/leaderboard/LeaderboardTable.vue";
import { useLeaderboardStore } from "../stores/leaderboard";

const leaderboardStore = useLeaderboardStore();

onMounted(() => {
  leaderboardStore.fetchLeaderboard();
});
</script>
