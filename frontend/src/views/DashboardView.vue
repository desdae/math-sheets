<template>
  <section data-testid="dashboard-page" class="page-stack">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Dashboard</p>
        <h1>{{ authStore.user ? `Welcome back, ${authStore.user.publicNickname}` : "Anonymous practice mode" }}</h1>
      </div>
    </div>

    <NextActionPanel
      :eyebrow="nextAction.eyebrow"
      :title="nextAction.title"
      :description="nextAction.description"
      :cta="nextAction.cta"
      :to="nextAction.to"
    />

    <div v-if="stats" class="stat-grid dashboard-stats-strip">
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

    <RecentActivityList
      :local-items="worksheetStore.anonymousWorksheets.slice(0, 3)"
      :remote-items="worksheetStore.remoteWorksheets.slice(0, 5)"
    />

    <div class="card dashboard-support-grid">
      <div class="page-stack">
        <h2>Local on this device</h2>
        <WorksheetSummaryCard
          v-for="worksheet in worksheetStore.anonymousWorksheets.slice(0, 2)"
          :key="worksheet.id"
          :worksheet="worksheet"
        />
        <EmptyState
          v-if="worksheetStore.anonymousWorksheets.length === 0"
          title="No local worksheets yet"
          description="Generate a worksheet to start solving right away."
        />
      </div>

      <div class="page-stack">
        <h2>Synced summary</h2>
        <p class="lede">
          {{
            authStore.user
              ? "Signed-in work appears in your library and leaderboard automatically."
              : "Sign in later when you want synced history and rankings."
          }}
        </p>
        <RouterLink class="button-secondary" to="/worksheets">Open saved worksheets</RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import EmptyState from "../components/common/EmptyState.vue";
import NextActionPanel from "../components/dashboard/NextActionPanel.vue";
import RecentActivityList from "../components/dashboard/RecentActivityList.vue";
import StatCard from "../components/common/StatCard.vue";
import WorksheetSummaryCard from "../components/worksheet/WorksheetSummaryCard.vue";
import { apiFetch } from "../lib/api";
import { formatPercent } from "../lib/format";
import { useAuthStore } from "../stores/auth";
import { useWorksheetStore } from "../stores/worksheet";

const authStore = useAuthStore();
const worksheetStore = useWorksheetStore();
const stats = ref<Record<string, number> | null>(null);

const latestUnfinishedWorksheet = computed(() => {
  const remote = worksheetStore.remoteWorksheets.find((worksheet) => worksheet.status !== "completed");

  if (remote) {
    return {
      id: String(remote.id),
      title: remote.title
    };
  }

  const local = worksheetStore.anonymousWorksheets.find((worksheet) => worksheet.status !== "completed");

  if (local) {
    return {
      id: local.id,
      title: local.title
    };
  }

  return null;
});

const nextAction = computed(() =>
  latestUnfinishedWorksheet.value
    ? {
        eyebrow: "Continue practicing",
        title: latestUnfinishedWorksheet.value.title,
        description: "You already have work in progress. Jump back in from where you stopped.",
        cta: "Resume worksheet",
        to: `/worksheets/${latestUnfinishedWorksheet.value.id}`
      }
    : {
        eyebrow: "Start fresh",
        title: "Create a new worksheet",
        description: "Build a printable practice set that fits today's pace and skill mix.",
        cta: "New worksheet",
        to: "/generate"
      }
);

onMounted(async () => {
  if (authStore.user) {
    stats.value = await apiFetch("/users/me/stats");
  }
});
</script>
