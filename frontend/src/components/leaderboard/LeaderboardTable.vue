<template>
  <div class="card">
    <table class="leaderboard-table">
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
        <tr v-for="(row, index) in rows" :key="row.user_id">
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
defineProps<{
  rows: Array<{
    user_id: string;
    public_nickname: string;
    worksheets_completed: number;
    problems_solved: number;
    accuracy_percentage: number;
  }>;
}>();
</script>
