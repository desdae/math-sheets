<template>
  <form data-testid="generator-form" class="generator-form card" @submit.prevent="emitGenerate">
    <div class="form-grid">
      <label>
        Problems
        <input data-testid="problem-count-input" v-model.number="form.problemCount" type="number" min="1" max="100" />
      </label>

      <label>
        Difficulty
        <select v-model="form.difficulty">
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </label>

      <label>
        Range Min
        <input v-model.number="form.numberRangeMin" type="number" min="0" />
      </label>

      <label>
        Range Max
        <input v-model.number="form.numberRangeMax" type="number" min="1" />
      </label>

      <label>
        Worksheet size
        <select v-model="form.worksheetSize">
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </label>
    </div>

    <fieldset class="operation-picker">
      <legend>Allowed operations</legend>
      <label v-for="operation in operations" :key="operation">
        <input :checked="form.allowedOperations.includes(operation)" type="checkbox" @change="toggleOperation(operation)" />
        {{ operation }}
      </label>
    </fieldset>

    <label class="checkbox-row">
      <input v-model="form.cleanDivisionOnly" type="checkbox" />
      Clean integer division only
    </label>

    <button data-testid="generate-submit" class="button" type="submit">Generate worksheet</button>
  </form>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import type { WorksheetConfig } from "../../stores/worksheet";

const emit = defineEmits<{
  generate: [payload: WorksheetConfig];
}>();

const operations: WorksheetConfig["allowedOperations"] = ["+", "-", "*", "/"];

const form = reactive<WorksheetConfig>({
  problemCount: 12,
  difficulty: "easy",
  allowedOperations: ["+", "-"],
  numberRangeMin: 1,
  numberRangeMax: 10,
  worksheetSize: "medium",
  cleanDivisionOnly: true
});

const toggleOperation = (operation: WorksheetConfig["allowedOperations"][number]) => {
  if (form.allowedOperations.includes(operation)) {
    if (form.allowedOperations.length > 1) {
      form.allowedOperations = form.allowedOperations.filter((item) => item !== operation);
    }
  } else {
    form.allowedOperations = [...form.allowedOperations, operation];
  }
};

const emitGenerate = () => emit("generate", { ...form });
</script>
