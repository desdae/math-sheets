<template>
  <section data-testid="worksheet-grid" class="worksheet-grid worksheet-grid-solve">
    <article
      v-for="question in questions"
      :key="question.id ?? question.questionOrder"
      class="worksheet-cell worksheet-answer-card"
      :data-testid="`worksheet-cell-${question.questionOrder}`"
    >
      <div
        class="worksheet-answer-shell"
        :class="`worksheet-answer-shell-${answerStates[question.questionOrder - 1]}`"
        :data-testid="`answer-state-${question.questionOrder}`"
        :data-answer-state="answerStates[question.questionOrder - 1]"
      >
        <label :for="`answer-${question.questionOrder}`">{{ question.displayText }}</label>
        <input
          :data-testid="`answer-input-${question.questionOrder}`"
          :id="`answer-${question.questionOrder}`"
          :value="answers[question.questionOrder - 1] ?? ''"
          :disabled="disabled"
          inputmode="numeric"
          @input="$emit('update-answer', question.questionOrder - 1, ($event.target as HTMLInputElement).value)"
        />
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import type { WorksheetQuestion } from "../../stores/worksheet";

defineProps<{
  questions: WorksheetQuestion[];
  answers: Array<string | null>;
  answerStates: Array<"empty" | "filled" | "correct" | "wrong">;
  disabled?: boolean;
}>();

defineEmits<{
  "update-answer": [index: number, value: string];
}>();
</script>
