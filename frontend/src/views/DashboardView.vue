<template>
  <section data-testid="dashboard-page" class="page-stack">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Dashboard</p>
        <h1>{{ authStore.user ? `Welcome back, ${authStore.user.displayName}` : "Anonymous practice mode" }}</h1>
      </div>
      <RouterLink class="button" to="/generate">New worksheet</RouterLink>
    </div>

    <div v-if="stats" class="stat-grid">
      <StatCard label="Worksheets completed" :value="stats.worksheets_completed" />
      <StatCard label="Problems solved" :value="stats.problems_solved" />
      <StatCard label="Correct answers" :value="stats.correct_answers" />
      <StatCard label="Accuracy" :value="formatPercent(stats.accuracy_percentage)" />
    </div>

    <div v-else class="card">
      <p>
        Anonymous mode keeps worksheets on this device. Sign in when you want synced history, personal stats, and public
        leaderboard rankings.
      </p>
    </div>

    <div class="two-column">
      <div class="page-stack">
        <h2>Local worksheets</h2>
        <WorksheetSummaryCard v-for="worksheet in worksheetStore.anonymousWorksheets.slice(0, 3)" :key="worksheet.id" :worksheet="worksheet" />
        <EmptyState
          v-if="worksheetStore.anonymousWorksheets.length === 0"
          title="No local worksheets yet"
          description="Generate a worksheet to start solving right away."
        />
      </div>

      <div class="page-stack">
        <h2>Synced history</h2>
        <div v-if="worksheetStore.remoteWorksheets.length === 0" class="card">
          <p>Signed-in worksheet history will appear here.</p>
        </div>
        <div v-for="worksheet in worksheetStore.remoteWorksheets.slice(0, 5)" :key="String(worksheet.id)" class="card">
          <h3>{{ worksheet.title }}</h3>
          <p>{{ worksheet.status }} • {{ worksheet.problemCount ?? worksheet.problem_count }} problems</p>
        </div>
      </div>
    </div>

    <ImportLocalProgressModal
      :open="worksheetStore.showImportModal"
      @confirm="handleImport"
      @decline="worksheetStore.rememberImportDecision('declined')"
    />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import EmptyState from "../components/common/EmptyState.vue";
import ImportLocalProgressModal from "../components/common/ImportLocalProgressModal.vue";
import StatCard from "../components/common/StatCard.vue";
import WorksheetSummaryCard from "../components/worksheet/WorksheetSummaryCard.vue";
import { apiFetch } from "../lib/api";
import { formatPercent } from "../lib/format";
import { useAuthStore } from "../stores/auth";
import { useWorksheetStore } from "../stores/worksheet";

const authStore = useAuthStore();
const worksheetStore = useWorksheetStore();
const stats = ref<Record<string, number> | null>(null);

const handleImport = async () => {
  await worksheetStore.importAnonymousWorksheets();
  stats.value = authStore.user ? await apiFetch("/users/me/stats") : null;
};

onMounted(async () => {
  if (authStore.user) {
    stats.value = await apiFetch("/users/me/stats");
  }
});
</script>
