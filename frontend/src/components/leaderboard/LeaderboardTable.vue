<template>
  <div class="card">
    <p v-if="!isLoading && rows.length === 0" class="lede">
      Complete a worksheet in the selected period to start appearing in the leaderboard.
    </p>

    <table v-else class="leaderboard-table">
      <thead>
        <tr>
          <th>#</th>
          <th>User</th>
          <th>Worksheets</th>
          <th>Problems</th>
          <th>Accuracy</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, index) in rows"
          :key="`${row.public_nickname}-${index}`"
          :class="{ 'leaderboard-row-current': row.public_nickname === currentUserNickname }"
        >
          <td>{{ index + 1 }}</td>
          <td>{{ row.public_nickname }}</td>
          <td>{{ row.worksheets_completed }}</td>
          <td>{{ row.problems_solved }}</td>
          <td>{{ row.accuracy_percentage }}%</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { LeaderboardRow } from "../../stores/leaderboard";

defineProps<{
  rows: LeaderboardRow[];
  currentUserNickname?: string | null;
  isLoading?: boolean;
}>();
</script>
