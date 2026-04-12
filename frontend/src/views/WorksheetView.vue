<template>
  <section v-if="worksheet" data-testid="worksheet-page" class="page-stack">
    <div class="row-between">
      <div>
        <p class="eyebrow">Worksheet</p>
        <h1>{{ worksheet.title }}</h1>
      </div>
      <div class="hero-actions app-actions">
        <button class="button button-secondary" @click="saveProgress">Save progress</button>
        <button class="button" @click="submitWorksheet">Submit</button>
      </div>
    </div>

    <WorksheetGrid :questions="worksheet.questions" :answers="worksheet.answers" @update-answer="worksheetStore.updateAnswer" />

    <div v-if="worksheet.result" class="card">
      <h2>Completed</h2>
      <p>
        Score: {{ worksheet.result.scoreCorrect }}/{{ worksheet.result.scoreTotal }} ({{ worksheet.result.accuracyPercentage }}%)
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import WorksheetGrid from "../components/worksheet/WorksheetGrid.vue";
import { useAuthStore } from "../stores/auth";
import { useWorksheetStore } from "../stores/worksheet";

const route = useRoute();
const authStore = useAuthStore();
const worksheetStore = useWorksheetStore();

const worksheet = computed(() => worksheetStore.activeWorksheet);

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
      answers: payload.answers.map((entry: { answerText: string | null }) => entry.answerText),
      source: "remote",
      localImportKey: payload.worksheet.id,
      createdAt: payload.worksheet.createdAt,
      submittedAt: payload.worksheet.submittedAt
    });
  }
});

const saveProgress = async () => {
  if (worksheet.value) {
    await worksheetStore.saveProgress(worksheet.value);
  }
};

const submitWorksheet = async () => {
  await worksheetStore.submitActiveWorksheet();
  if (worksheet.value?.source === "local") {
    worksheetStore.saveLocalWorksheet(worksheet.value);
  }
};
</script>
