<template>
  <section data-testid="generator-page" class="page-stack">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Generator</p>
        <h1>Create a worksheet</h1>
        <p class="lede">Build the practice set step by step, then review a live worksheet snapshot before you print or save it.</p>
      </div>
    </div>

    <GeneratorForm @generate="handleGenerate" />
  </section>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import GeneratorForm from "../components/worksheet/GeneratorForm.vue";
import { useAuthStore } from "../stores/auth";
import { type WorksheetConfig, useWorksheetStore } from "../stores/worksheet";

const authStore = useAuthStore();
const worksheetStore = useWorksheetStore();
const router = useRouter();

const handleGenerate = async (config: WorksheetConfig) => {
  const worksheet = await worksheetStore.generateWorksheet(config);
  const record = authStore.user ? await worksheetStore.persistSignedInWorksheet(worksheet) : worksheet;

  await router.push(`/worksheets/${record.id}`);
};
</script>
