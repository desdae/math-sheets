<template>
  <article
    :data-testid="scope === 'synced' ? 'saved-remote-worksheet-link' : 'saved-local-worksheet-link'"
    class="saved-worksheet-row"
    :class="`saved-worksheet-row-${scope}`"
    role="link"
    tabindex="0"
    @click="$emit('open', worksheet.id)"
    @keydown.enter.prevent="$emit('open', worksheet.id)"
    @keydown.space.prevent="$emit('open', worksheet.id)"
  >
    <div class="saved-worksheet-row-top">
      <div class="saved-worksheet-row-heading">
        <strong>{{ worksheet.title }}</strong>
        <span class="saved-worksheet-row-subtitle">
          {{ timestampLabel }} • {{ worksheet.problemCount }} problems
        </span>
      </div>

      <div class="saved-worksheet-row-status">
        <span class="saved-worksheet-status-chip">{{ worksheet.status }}</span>
        <span v-if="worksheet.result" class="saved-worksheet-score-badge">
          {{ formattedScore }}
        </span>
      </div>
    </div>

    <div class="saved-worksheet-row-meta">
      <button
        v-for="chip in chips"
        :key="chip.key"
        :data-testid="`worksheet-chip-${chip.value}`"
        class="worksheet-meta-chip"
        :class="{ 'worksheet-meta-chip-active': activeFilters.has(chip.value) }"
        @click.stop="$emit('toggle-filter', chip.value)"
      >
        {{ chip.label }}
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { buildWorksheetChips, formatWorksheetTimestamp, type WorksheetSummaryRecord } from "../../lib/saved-worksheets";

const props = defineProps<{
  worksheet: WorksheetSummaryRecord;
  activeFilters: Set<string>;
  scope: "synced" | "local";
}>();

defineEmits<{
  open: [worksheetId: string];
  "toggle-filter": [value: string];
}>();

const chips = computed(() => buildWorksheetChips(props.worksheet));
const timestampLabel = computed(() => formatWorksheetTimestamp(props.worksheet.createdAt));
const formattedScore = computed(() => {
  if (!props.worksheet.result) {
    return "";
  }

  return `${props.worksheet.result.accuracyPercentage}%`;
});
</script>
