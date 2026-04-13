<template>
  <section v-if="worksheet" data-testid="worksheet-page" class="page-stack worksheet-page-shell">
    <header class="worksheet-page-header">
      <div class="worksheet-page-heading">
        <p class="eyebrow">Worksheet</p>
        <h1>{{ worksheet.title }}</h1>
      </div>
      <p class="lede">{{ worksheet.questions.length }} problems · {{ difficultyLabel }}</p>
      <p class="worksheet-progress-summary">{{ answeredCount }} of {{ worksheet.questions.length }} answered</p>
      <div class="worksheet-progress-bar" aria-hidden="true">
        <span :style="{ width: `${progressPercent}%` }" />
      </div>
      <p data-testid="worksheet-save-status" class="worksheet-save-status">
        {{ saveStatusLabel }}
      </p>
    </header>

    <WorksheetGrid
      :questions="worksheet.questions"
      :answers="worksheet.answers"
      :answer-states="answerStates"
      :worksheet-size="worksheet.config.worksheetSize"
      :disabled="isCompleted"
      @update-answer="worksheetStore.updateAnswer"
    />

    <section data-testid="worksheet-review-panel" class="worksheet-review-panel">
      <div class="worksheet-review-copy">
        <p class="eyebrow">{{ isCompleted ? "Finished" : "Before you submit" }}</p>
        <h2>{{ isCompleted ? "Completed" : "Review before submit" }}</h2>
        <p v-if="!isCompleted">{{ unansweredCount }} unanswered</p>
        <p v-else>Completed and locked</p>
      </div>
      <div v-if="!isCompleted" class="worksheet-review-actions">
        <div v-if="unansweredCount > 0" data-testid="worksheet-submit-warning" class="worksheet-submit-warning">
          <strong>{{ unansweredCount }} problems are still empty.</strong>
          <p>They will be marked wrong if you submit now.</p>
        </div>

        <div v-if="showSubmitConfirm" data-testid="worksheet-submit-confirm" class="worksheet-submit-confirm">
          <div class="worksheet-submit-confirm-copy">
            <strong>Submit with unanswered problems?</strong>
            <p>You still have {{ unansweredCount }} blank {{ unansweredCount === 1 ? "answer" : "answers" }}.</p>
          </div>
          <div class="worksheet-submit-confirm-actions">
            <button class="button button-secondary" @click="showSubmitConfirm = false">Go back</button>
            <button class="button" @click="confirmSubmitWorksheet">Submit with blanks</button>
          </div>
        </div>

        <button
          v-else
          data-testid="submit-worksheet-button"
          class="button worksheet-submit-button"
          @click="submitWorksheet"
        >
          Submit worksheet
        </button>
      </div>
      <WorksheetCompletionActions v-else />
    </section>

    <div v-if="resultSummary" class="card worksheet-result-card">
      <h2>Completed</h2>
      <p>
        Score: {{ resultSummary.scoreCorrect }}/{{ resultSummary.scoreTotal }} ({{ resultSummary.accuracyPercentage }}%)
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import WorksheetCompletionActions from "../components/worksheet/WorksheetCompletionActions.vue";
import WorksheetGrid from "../components/worksheet/WorksheetGrid.vue";
import { useAuthStore } from "../stores/auth";
import { useWorksheetStore } from "../stores/worksheet";

const route = useRoute();
const authStore = useAuthStore();
const worksheetStore = useWorksheetStore();
const showSubmitConfirm = ref(false);

const worksheet = computed(() => worksheetStore.activeWorksheet);
const isCompleted = computed(() => worksheet.value?.status === "completed");
const difficultyLabel = computed(() => {
  if (!worksheet.value) {
    return "";
  }

  return `${worksheet.value.config.difficulty.charAt(0).toUpperCase()}${worksheet.value.config.difficulty.slice(1)} difficulty`;
});
const answeredCount = computed(() => worksheet.value?.answers.filter((answer) => String(answer ?? "").trim()).length ?? 0);
const unansweredCount = computed(() => worksheet.value?.answers.filter((answer) => !String(answer ?? "").trim()).length ?? 0);
const progressPercent = computed(() => {
  if (!worksheet.value || worksheet.value.questions.length === 0) {
    return 0;
  }

  return Math.round((answeredCount.value / worksheet.value.questions.length) * 100);
});
const saveStatusLabel = computed(() => {
  if (isCompleted.value) {
    return "Completed and locked";
  }

  if (worksheetStore.saveState === "saving") {
    return "Saving...";
  }

  if (worksheetStore.saveState === "error") {
    return "Save failed";
  }

  if (worksheetStore.saveState === "saved") {
    return "Saved just now";
  }

  if (worksheetStore.saveState === "dirty") {
    return "Saving soon...";
  }

  return "All progress saved";
});
const answerStates = computed(() => {
  if (!worksheet.value) {
    return [];
  }

  return worksheet.value.questions.map((question, index) => {
    const answer = String(worksheet.value?.answers[index] ?? "").trim();

    if (!isCompleted.value) {
      return answer ? "filled" : "empty";
    }

    if (!answer) {
      return "wrong";
    }

    return Number(answer) === question.correctAnswer ? "correct" : "wrong";
  });
});
const resultSummary = computed(() => {
  if (!worksheet.value) {
    return null;
  }

  if (worksheet.value.result) {
    return worksheet.value.result;
  }

  if (!isCompleted.value) {
    return null;
  }

  const scoreCorrect = worksheet.value.questions.filter(
    (question, index) => Number(worksheet.value?.answers[index] ?? "") === question.correctAnswer
  ).length;
  const scoreTotal = worksheet.value.questions.length;

  return {
    scoreCorrect,
    scoreTotal,
    accuracyPercentage: Number(((scoreCorrect / scoreTotal) * 100).toFixed(2))
  };
});

onMounted(async () => {
  const worksheetId = String(route.params.id);

  const localWorksheet = worksheetStore.anonymousWorksheets.find((entry) => entry.id === worksheetId);
  if (localWorksheet) {
    worksheetStore.setActiveWorksheet(localWorksheet);
    return;
  }

  if (authStore.user) {
    const payload = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api"}/worksheets/${worksheetId}`, {
      headers: {
        Authorization: authStore.accessToken ? `Bearer ${authStore.accessToken}` : ""
      }
    }).then((response) => response.json());
    const mappedAnswers = payload.questions.map(() => null as string | null);

    for (const entry of payload.answers as Array<{ questionOrder: number; answerText: string | null; isCorrect: boolean | null }>) {
      mappedAnswers[entry.questionOrder - 1] = entry.answerText;
    }

    worksheetStore.setActiveWorksheet({
      id: payload.worksheet.id,
      title: payload.worksheet.title,
      status: payload.worksheet.status,
      config: {
        problemCount: payload.worksheet.problemCount,
        difficulty: payload.worksheet.difficulty,
        allowedOperations: payload.worksheet.allowedOperations,
        numberRangeMin: payload.worksheet.numberRangeMin,
        numberRangeMax: payload.worksheet.numberRangeMax,
        worksheetSize: payload.worksheet.worksheetSize,
        cleanDivisionOnly: payload.worksheet.cleanDivisionOnly
      },
      questions: payload.questions,
      answers: mappedAnswers,
      source: "remote",
      localImportKey: payload.worksheet.id,
      createdAt: payload.worksheet.createdAt,
      submittedAt: payload.worksheet.submittedAt,
      result:
        payload.worksheet.status === "completed"
          ? {
              scoreCorrect: payload.answers.filter((entry: { isCorrect: boolean | null }) => Boolean(entry.isCorrect)).length,
              scoreTotal: payload.questions.length,
              accuracyPercentage: Number(
                (
                  (payload.answers.filter((entry: { isCorrect: boolean | null }) => Boolean(entry.isCorrect)).length /
                    Math.max(payload.questions.length, 1)) *
                  100
                ).toFixed(2)
              )
            }
          : undefined
    });
  }
});

watch(unansweredCount, (count) => {
  if (count === 0) {
    showSubmitConfirm.value = false;
  }
});

const confirmSubmitWorksheet = async () => {
  await worksheetStore.submitActiveWorksheet();
  if (worksheet.value?.source === "local") {
    worksheetStore.saveLocalWorksheet(worksheet.value);
  }
  showSubmitConfirm.value = false;
};

const submitWorksheet = async () => {
  if (!isCompleted.value && unansweredCount.value > 0) {
    showSubmitConfirm.value = true;
    return;
  }

  await confirmSubmitWorksheet();
};
</script>
