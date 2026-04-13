<template>
  <form data-testid="generator-form" class="generator-form generator-studio" @submit.prevent="emitGenerate">
    <div class="generator-studio-layout">
      <div class="generator-studio-steps">
        <section class="generator-step card">
          <div class="generator-step-header">
            <p class="eyebrow">Step 1</p>
            <h2>Set the pace</h2>
            <p>Choose how much practice to print and how challenging it should feel.</p>
          </div>

          <div class="form-grid generator-step-grid">
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
              Worksheet size
              <select v-model="form.worksheetSize">
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </label>
          </div>
        </section>

        <section class="generator-step card">
          <div class="generator-step-header">
            <p class="eyebrow">Step 2</p>
            <h2>Choose the skills</h2>
            <p>Mix operations freely and keep the number range matched to the learner.</p>
          </div>

          <fieldset class="operation-picker">
            <legend>Allowed operations</legend>
            <label
              v-for="operation in operations"
              :key="operation"
              class="operation-chip"
              :class="{ 'operation-chip-active': form.allowedOperations.includes(operation) }"
            >
              <input :checked="form.allowedOperations.includes(operation)" type="checkbox" @change="toggleOperation(operation)" />
              <span>{{ operationLabels[operation] }}</span>
            </label>
          </fieldset>

          <div class="form-grid generator-step-grid">
            <label>
              Range Min
              <input v-model.number="form.numberRangeMin" type="number" min="0" />
            </label>

            <label>
              Range Max
              <input v-model.number="form.numberRangeMax" type="number" min="1" />
            </label>
          </div>
        </section>

        <section class="generator-step card">
          <div class="generator-step-header">
            <p class="eyebrow">Step 3</p>
            <h2>Refine the output</h2>
            <p>Keep division classroom-friendly by default, or loosen the rules when needed.</p>
          </div>

          <label class="checkbox-row checkbox-panel">
            <input v-model="form.cleanDivisionOnly" type="checkbox" />
            <span>
              <strong>Clean integer division only</strong>
              <small>Uses tidy division questions with whole-number answers.</small>
            </span>
          </label>
        </section>
      </div>

      <aside data-testid="generator-preview" class="generator-preview-panel">
        <div class="generator-preview-top">
          <p class="eyebrow">Live preview</p>
          <h2>{{ previewTitle }}</h2>
          <p>{{ previewDescription }}</p>
        </div>

        <div class="generator-preview-metrics">
          <div class="generator-preview-metric">
            <span class="stat-label">Load</span>
            <strong data-testid="preview-problem-count">{{ form.problemCount }} problems</strong>
          </div>
          <div class="generator-preview-metric">
            <span class="stat-label">Range</span>
            <strong>{{ normalizedRangeMin }}-{{ normalizedRangeMax }}</strong>
          </div>
          <div class="generator-preview-metric">
            <span class="stat-label">Mix</span>
            <strong>{{ operationSummary }}</strong>
          </div>
        </div>

        <div class="generator-preview-sheet">
          <div class="generator-preview-sheet-header">
            <div>
              <p class="eyebrow">Worksheet snapshot</p>
              <h3>{{ previewTitle }}</h3>
            </div>
            <span class="generator-preview-size">{{ worksheetSizeLabel }}</span>
          </div>

          <ol class="generator-preview-list">
            <li v-for="question in previewQuestions" :key="question.id">
              <span>{{ question.text }}</span>
              <span class="generator-preview-blank"></span>
            </li>
          </ol>
        </div>

        <div class="generator-preview-footer">
          <div class="generator-preview-note">
            <strong>{{ difficultyLabel }} practice</strong>
            <p>{{ divisionNote }}</p>
          </div>
          <button data-testid="generate-submit" class="button" type="submit">Generate worksheet</button>
        </div>
      </aside>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";
import type { WorksheetConfig } from "../../stores/worksheet";

const emit = defineEmits<{
  generate: [payload: WorksheetConfig];
}>();

const operations: WorksheetConfig["allowedOperations"] = ["+", "-", "*", "/"];
const operationLabels: Record<WorksheetConfig["allowedOperations"][number], string> = {
  "+": "Addition",
  "-": "Subtraction",
  "*": "Multiplication",
  "/": "Division"
};

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

const difficultyLabel = computed(() => form.difficulty.charAt(0).toUpperCase() + form.difficulty.slice(1));
const worksheetSizeLabel = computed(() => form.worksheetSize.charAt(0).toUpperCase() + form.worksheetSize.slice(1));
const operationSummary = computed(() => form.allowedOperations.map((operation) => operationLabels[operation]).join(", "));
const previewTitle = computed(() => `${difficultyLabel.value} ${operationSummary.value} practice`);
const previewDescription = computed(
  () => `${form.problemCount} printable questions across a ${worksheetSizeLabel.value.toLowerCase()} worksheet layout.`
);
const divisionNote = computed(() =>
  form.cleanDivisionOnly ? "Division samples stay clean and whole-number friendly." : "Division samples may include tougher results."
);
const normalizedRangeMin = computed(() => Math.min(form.numberRangeMin, form.numberRangeMax));
const normalizedRangeMax = computed(() => Math.max(form.numberRangeMin, form.numberRangeMax));
const buildPreviewQuestion = (operation: WorksheetConfig["allowedOperations"][number], index: number) => {
  const min = normalizedRangeMin.value;
  const max = normalizedRangeMax.value;
  const spread = Math.max(1, max - min + 1);
  const first = min + ((index * 7 + 3) % spread);
  const second = min + ((index * 5 + 2) % spread);

  if (operation === "/") {
    const divisor = Math.max(1, min + ((index * 3 + 2) % Math.max(1, max - min + 1)));
    const quotient = Math.max(1, Math.min(max, min + ((index * 2 + 1) % Math.max(1, max - min + 1))));
    const dividend = form.cleanDivisionOnly ? divisor * quotient : divisor * quotient + (index % Math.max(1, divisor));
    return `${dividend} / ${divisor} =`;
  }

  if (operation === "-") {
    const left = Math.max(first, second);
    const right = Math.min(first, second);
    return `${left} - ${right} =`;
  }

  if (operation === "*") {
    const left = Math.max(1, Math.min(max, first));
    const right = Math.max(1, Math.min(max, Math.max(min, second)));
    return `${left} * ${right} =`;
  }

  return `${first} + ${second} =`;
};

const previewQuestions = computed(() =>
  Array.from({ length: 4 }, (_, index) => ({
    id: `preview-question-${index}`,
    text: buildPreviewQuestion(form.allowedOperations[index % form.allowedOperations.length], index)
  }))
);

const emitGenerate = () =>
  emit("generate", {
    ...form,
    numberRangeMin: normalizedRangeMin.value,
    numberRangeMax: normalizedRangeMax.value
  });
</script>
