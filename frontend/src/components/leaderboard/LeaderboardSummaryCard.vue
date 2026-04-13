<template>
  <section class="card leaderboard-summary-card">
    <p class="eyebrow">Your standing</p>
    <h2 v-if="isRanked">You are ranked #{{ rank }}</h2>
    <h2 v-else>You're not ranked yet</h2>
    <p class="lede">
      <template v-if="isRanked">
        Keep solving to move up the {{ metricLabel.toLowerCase() }} leaderboard.
      </template>
      <template v-else-if="requiresThreshold">
        Accuracy rankings appear after at least 10 solved problems in the selected period.
      </template>
      <template v-else>
        Complete a worksheet in the selected period to appear here.
      </template>
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  rank: number;
  isRanked: boolean;
  metric: "worksheets" | "problems" | "accuracy";
  requiresThreshold: boolean;
}>();

const metricLabel = computed(() => {
  if (props.metric === "worksheets") {
    return "Worksheets";
  }

  if (props.metric === "problems") {
    return "Problems";
  }

  return "Accuracy";
});
</script>
