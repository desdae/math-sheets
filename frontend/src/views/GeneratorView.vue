<template>
  <section data-testid="generator-page" class="page-stack">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Generator</p>
        <h1>Create a worksheet</h1>
        <p class="lede">Build the practice set step by step, then review a live worksheet snapshot before you print or save it.</p>
      </div>
    </div>

    <GeneratorForm :initial-operations="initialOperations" @generate="handleGenerate" />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import GeneratorForm from "../components/worksheet/GeneratorForm.vue";
import { useAuthStore } from "../stores/auth";
import { type WorksheetConfig, useWorksheetStore } from "../stores/worksheet";

const authStore = useAuthStore();
const route = useRoute();
const worksheetStore = useWorksheetStore();
const router = useRouter();

const supportedOperations = ["+", "-", "*", "/"] as const;
const initialOperations = computed<WorksheetConfig["allowedOperations"] | undefined>(() => {
  const rawOperations = route.query.operations;
  const source = Array.isArray(rawOperations) ? rawOperations[0] : rawOperations;

  if (typeof source !== "string") {
    return undefined;
  }

  const parsed = source
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is WorksheetConfig["allowedOperations"][number] =>
      supportedOperations.includes(item as WorksheetConfig["allowedOperations"][number])
    );

  return parsed.length > 0 ? parsed : undefined;
});

const handleGenerate = async (config: WorksheetConfig) => {
  const worksheet = await worksheetStore.generateWorksheet(config);
  const record = authStore.user ? await worksheetStore.persistSignedInWorksheet(worksheet) : worksheet;

  await router.push(`/worksheets/${record.id}`);
};
</script>
