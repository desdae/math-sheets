<template>
  <section data-testid="worksheet-grid" class="worksheet-grid">
    <article
      v-for="question in questions"
      :key="question.id ?? question.questionOrder"
      class="worksheet-cell"
      :data-testid="`worksheet-cell-${question.questionOrder}`"
    >
      <label :for="`answer-${question.questionOrder}`">{{ question.displayText }}</label>
      <input
        :data-testid="`answer-input-${question.questionOrder}`"
        :id="`answer-${question.questionOrder}`"
        :value="answers[question.questionOrder - 1] ?? ''"
        inputmode="numeric"
        @input="$emit('update-answer', question.questionOrder - 1, ($event.target as HTMLInputElement).value)"
      />
    </article>
  </section>
</template>

<script setup lang="ts">
import type { WorksheetQuestion } from "../../stores/worksheet";

defineProps<{
  questions: WorksheetQuestion[];
  answers: Array<string | null>;
}>();

defineEmits<{
  "update-answer": [index: number, value: string];
}>();
</script>
