<template>
  <article class="card summary-card">
    <p class="eyebrow">{{ worksheet.status }}</p>
    <h3>{{ worksheet.title }}</h3>
    <p>{{ worksheet.questions.length }} problems • {{ worksheet.config.difficulty }} • {{ worksheet.config.worksheetSize }}</p>
    <p v-if="worksheet.result">
      Score: {{ worksheet.result.scoreCorrect }}/{{ worksheet.result.scoreTotal }} ({{ worksheet.result.accuracyPercentage }}%)
    </p>
  </article>
</template>

<script setup lang="ts">
import type { WorksheetRecord } from "../../stores/worksheet";

defineProps<{
  worksheet: WorksheetRecord;
}>();
</script>
