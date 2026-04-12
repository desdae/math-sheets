<template>
  <section data-testid="generator-page" class="page-stack">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Generator</p>
        <h1>Create a worksheet</h1>
      </div>
    </div>

    <GeneratorForm @generate="handleGenerate" />

    <div v-if="worksheetStore.activeWorksheet" class="card page-stack">
      <div class="row-between">
        <div>
          <h2>{{ worksheetStore.activeWorksheet.title }}</h2>
          <p>{{ worksheetStore.activeWorksheet.questions.length }} printable problems</p>
        </div>
        <div class="hero-actions">
          <button class="button button-secondary" @click="saveDraft">Save draft</button>
          <RouterLink class="button" :to="`/worksheets/${worksheetStore.activeWorksheet.id}`">Open worksheet</RouterLink>
        </div>
      </div>
      <WorksheetGrid
        :questions="worksheetStore.activeWorksheet.questions"
        :answers="worksheetStore.activeWorksheet.answers"
        @update-answer="worksheetStore.updateAnswer"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { RouterLink, useRouter } from "vue-router";
import GeneratorForm from "../components/worksheet/GeneratorForm.vue";
import WorksheetGrid from "../components/worksheet/WorksheetGrid.vue";
import { useAuthStore } from "../stores/auth";
import { type WorksheetConfig, useWorksheetStore } from "../stores/worksheet";

const authStore = useAuthStore();
const worksheetStore = useWorksheetStore();
const router = useRouter();

const handleGenerate = async (config: WorksheetConfig) => {
  const worksheet = await worksheetStore.generateWorksheet(config);

  if (authStore.user) {
    await worksheetStore.persistSignedInWorksheet(worksheet);
  } else {
    worksheetStore.saveLocalWorksheet(worksheet);
  }
};

const saveDraft = async () => {
  if (!worksheetStore.activeWorksheet) {
    return;
  }

  await worksheetStore.saveProgress(worksheetStore.activeWorksheet);
  router.push(`/worksheets/${worksheetStore.activeWorksheet.id}`);
};
</script>
