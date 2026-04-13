<template>
  <section class="dashboard-activity">
    <div class="dashboard-activity-header">
      <div>
        <p class="eyebrow">Recent activity</p>
        <h2>Pick up where you left off</h2>
      </div>
      <RouterLink class="button-secondary dashboard-activity-link" to="/worksheets">Open library</RouterLink>
    </div>

    <div v-if="items.length === 0" class="empty-state dashboard-activity-empty">
      <h3>No worksheets yet</h3>
      <p>Generate a worksheet to start building your practice history.</p>
    </div>

    <div v-else class="dashboard-activity-list">
      <RouterLink
        v-for="item in items"
        :key="item.id"
        class="dashboard-activity-item"
        :to="`/worksheets/${item.id}`"
      >
        <div class="dashboard-activity-item-main">
          <strong>{{ item.title }}</strong>
          <span>{{ item.subtitle }}</span>
        </div>
        <div class="dashboard-activity-item-meta">
          <span class="saved-worksheet-status-chip">{{ item.statusLabel }}</span>
          <span v-if="item.score" class="saved-worksheet-score-badge">{{ item.score }}</span>
        </div>
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { formatWorksheetTimestamp, type WorksheetSummaryRecord } from "../../lib/saved-worksheets";
import type { WorksheetRecord } from "../../stores/worksheet";

const props = defineProps<{
  localItems: WorksheetRecord[];
  remoteItems: WorksheetSummaryRecord[];
}>();

const items = computed(() => {
  const local = props.localItems.map((worksheet) => ({
    id: worksheet.id,
    title: worksheet.title,
    statusLabel: worksheet.status,
    score: worksheet.result ? `${worksheet.result.accuracyPercentage}%` : "",
    subtitle: `${formatWorksheetTimestamp(worksheet.createdAt)} · local on this device`,
    createdAt: worksheet.createdAt
  }));

  const remote = props.remoteItems.map((worksheet) => ({
    id: String(worksheet.id),
    title: worksheet.title,
    statusLabel: worksheet.status,
    score: worksheet.result ? `${worksheet.result.accuracyPercentage}%` : "",
    subtitle: `${formatWorksheetTimestamp(worksheet.createdAt)} · synced`,
    createdAt: worksheet.createdAt
  }));

  return [...remote, ...local]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 6);
});
</script>
