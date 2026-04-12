# Worksheet View Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the worksheet page into a calmer single-column solving flow with auto-save, empty-only pre-submit highlighting, post-submit correctness states, and locked completed worksheets.

**Architecture:** Keep the worksheet store as the source of truth for mutability and persistence, then derive display state in the worksheet view and grid from worksheet status plus answer completeness. Implement the locking rule in both frontend and backend so completed worksheets cannot be edited or re-saved even if a client misbehaves.

**Tech Stack:** Vue 3 Composition API, Pinia, Vite, Vitest, Playwright, Express, PostgreSQL, Supertest

---

## File Structure

### Frontend

- Modify: `frontend/src/stores/worksheet.ts`
- Modify: `frontend/src/views/WorksheetView.vue`
- Modify: `frontend/src/components/worksheet/WorksheetGrid.vue`
- Modify: `frontend/src/styles/main.css`
- Create: `frontend/src/tests/worksheet-view.test.ts`

### Backend

- Modify: `backend/src/routes/worksheet.routes.ts`
- Create: `backend/src/tests/worksheet-save-completion.test.ts`

### End-to-end

- Modify: `e2e/specs/flows/anonymous-worksheet.spec.ts`
- Modify: `e2e/specs/flows/authenticated-worksheet.spec.ts`
- Create: `e2e/specs/flows/completed-worksheet-locking.spec.ts`

## Task 1: Add Frontend Worksheet View Tests for the New UX Rules

**Files:**
- Create: `frontend/src/tests/worksheet-view.test.ts`
- Test: `frontend/src/tests/worksheet-view.test.ts`

- [ ] **Step 1: Write the failing worksheet view tests**

Create `frontend/src/tests/worksheet-view.test.ts` with:

```ts
import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorksheetView from "../views/WorksheetView.vue";
import { useWorksheetStore } from "../stores/worksheet";

vi.mock("vue-router", () => ({
  useRoute: () => ({
    params: {
      id: "local-worksheet-1"
    }
  })
}));

const buildWorksheet = () => ({
  id: "local-worksheet-1",
  title: "Easy Practice",
  status: "partial" as const,
  config: {
    problemCount: 4,
    difficulty: "easy" as const,
    allowedOperations: ["+", "-"] as Array<"+" | "-" | "*" | "/">,
    numberRangeMin: 1,
    numberRangeMax: 10,
    worksheetSize: "medium" as const,
    cleanDivisionOnly: true
  },
  questions: [
    { questionOrder: 1, operation: "+", leftOperand: 2, rightOperand: 3, displayText: "2 + 3 =", correctAnswer: 5 },
    { questionOrder: 2, operation: "-", leftOperand: 7, rightOperand: 1, displayText: "7 - 1 =", correctAnswer: 6 },
    { questionOrder: 3, operation: "+", leftOperand: 4, rightOperand: 4, displayText: "4 + 4 =", correctAnswer: 8 },
    { questionOrder: 4, operation: "-", leftOperand: 9, rightOperand: 2, displayText: "9 - 2 =", correctAnswer: 7 }
  ],
  answers: ["5", "", "9", null],
  source: "local" as const,
  localImportKey: "local-import-1",
  createdAt: new Date().toISOString(),
  result: undefined
});

describe("WorksheetView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const worksheetStore = useWorksheetStore();
    worksheetStore.anonymousWorksheets = [buildWorksheet()];
    worksheetStore.setActiveWorksheet(buildWorksheet());
  });

  it("shows unanswered count and does not show wrong-answer state before submit", async () => {
    const wrapper = mount(WorksheetView);

    expect(wrapper.text()).toContain("2 unanswered");
    expect(wrapper.find('[data-testid="answer-state-2"]').attributes("data-answer-state")).toBe("empty");
    expect(wrapper.find('[data-testid="answer-state-3"]').attributes("data-answer-state")).toBe("filled");
  });

  it("disables inputs and exposes evaluated answer states after completion", async () => {
    const worksheetStore = useWorksheetStore();
    worksheetStore.setActiveWorksheet({
      ...buildWorksheet(),
      status: "completed",
      submittedAt: new Date().toISOString(),
      result: {
        scoreCorrect: 2,
        scoreTotal: 4,
        accuracyPercentage: 50
      }
    });

    const wrapper = mount(WorksheetView);

    expect(wrapper.text()).toContain("Completed and locked");
    expect(wrapper.find('[data-testid="answer-state-1"]').attributes("data-answer-state")).toBe("correct");
    expect(wrapper.find('[data-testid="answer-state-3"]').attributes("data-answer-state")).toBe("wrong");
    expect(wrapper.find('[data-testid="answer-input-1"]').attributes("disabled")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace frontend -- src/tests/worksheet-view.test.ts`

Expected: FAIL because `WorksheetView.vue` does not yet render unanswered summary text, `data-answer-state` markers, or disabled completed inputs.

- [ ] **Step 3: Commit the red test**

```bash
git add frontend/src/tests/worksheet-view.test.ts
git commit -m "test: add worksheet view ux expectations"
```

## Task 2: Add Store Guards and Auto-Save State

**Files:**
- Modify: `frontend/src/stores/worksheet.ts`
- Test: `frontend/src/tests/worksheet-view.test.ts`

- [ ] **Step 1: Write a failing store guard test**

Append to `frontend/src/tests/anonymous-worksheets.test.ts`:

```ts
import { createPinia, setActivePinia } from "pinia";
import { useWorksheetStore } from "../stores/worksheet";

it("does not allow completed worksheets to be edited", () => {
  setActivePinia(createPinia());
  const worksheetStore = useWorksheetStore();

  worksheetStore.activeWorksheet = {
    id: "local-1",
    title: "Easy Practice",
    status: "completed",
    config: {
      problemCount: 2,
      difficulty: "easy",
      allowedOperations: ["+"],
      numberRangeMin: 1,
      numberRangeMax: 10,
      worksheetSize: "small",
      cleanDivisionOnly: true
    },
    questions: [
      { questionOrder: 1, operation: "+", leftOperand: 2, rightOperand: 2, displayText: "2 + 2 =", correctAnswer: 4 },
      { questionOrder: 2, operation: "+", leftOperand: 3, rightOperand: 1, displayText: "3 + 1 =", correctAnswer: 4 }
    ],
    answers: ["4", "4"],
    source: "local",
    localImportKey: "import-key",
    createdAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    result: {
      scoreCorrect: 2,
      scoreTotal: 2,
      accuracyPercentage: 100
    }
  };

  worksheetStore.updateAnswer(0, "999");

  expect(worksheetStore.activeWorksheet.answers[0]).toBe("4");
});
```

- [ ] **Step 2: Run the store-related frontend tests to verify failure**

Run: `npm run test --workspace frontend -- src/tests/anonymous-worksheets.test.ts src/tests/worksheet-view.test.ts`

Expected: FAIL because `updateAnswer` still mutates completed worksheets and there is no save-state support yet.

- [ ] **Step 3: Implement save state, edit guards, and debounced auto-save hooks**

Update `frontend/src/stores/worksheet.ts`:

```ts
type WorksheetSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

export const useWorksheetStore = defineStore("worksheet", {
  state: () => ({
    anonymousWorksheets: anonymousStore.load<WorksheetRecord>(),
    remoteWorksheets: [] as Array<Record<string, unknown>>,
    activeWorksheet: null as WorksheetRecord | null,
    showImportModal: false,
    isLoading: false,
    saveState: "idle" as WorksheetSaveState,
    lastSavedAt: null as string | null
  }),
  actions: {
    markSaveQueued() {
      if (!this.activeWorksheet || this.activeWorksheet.status === "completed") {
        return;
      }

      this.saveState = "dirty";
    },
    async autoSaveActiveWorksheet() {
      if (!this.activeWorksheet || this.activeWorksheet.status === "completed") {
        return;
      }

      this.saveState = "saving";

      try {
        await this.saveProgress(this.activeWorksheet);
        this.lastSavedAt = new Date().toISOString();
        this.saveState = "saved";
      } catch {
        this.saveState = "error";
      }
    },
    queueAutoSave() {
      if (!this.activeWorksheet || this.activeWorksheet.status === "completed") {
        return;
      }

      this.markSaveQueued();

      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }

      autoSaveTimer = setTimeout(() => {
        void this.autoSaveActiveWorksheet();
      }, 500);
    },
    updateAnswer(index: number, value: string) {
      if (!this.activeWorksheet || this.activeWorksheet.status === "completed") {
        return;
      }

      this.activeWorksheet.answers[index] = value;
      this.activeWorksheet.status = "partial";
      this.queueAutoSave();
    },
    setActiveWorksheet(record: WorksheetRecord | null) {
      this.activeWorksheet = record ? cloneWorksheetRecord(record) : null;
      this.saveState = record?.status === "completed" ? "idle" : "saved";
      this.lastSavedAt = null;
    }
  }
});
```

- [ ] **Step 4: Run the targeted frontend tests again**

Run: `npm run test --workspace frontend -- src/tests/anonymous-worksheets.test.ts src/tests/worksheet-view.test.ts`

Expected: PARTIAL PASS. The store guard should pass, while the worksheet view test should still fail until the UI consumes the new state.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/worksheet.ts frontend/src/tests/anonymous-worksheets.test.ts frontend/src/tests/worksheet-view.test.ts
git commit -m "feat: add worksheet autosave state and completion guards"
```

## Task 3: Harden Backend Save Behavior for Completed Worksheets

**Files:**
- Create: `backend/src/tests/worksheet-save-completion.test.ts`
- Modify: `backend/src/routes/worksheet.routes.ts`

- [ ] **Step 1: Write the failing backend completion-guard test**

Create `backend/src/tests/worksheet-save-completion.test.ts`:

```ts
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import * as worksheetRepository from "../repositories/worksheet.repository.js";

vi.mock("../middleware/authenticate.js", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: "user-1" };
    next();
  }
}));

describe("worksheet save completion guard", () => {
  it("rejects saving a completed worksheet", async () => {
    vi.spyOn(worksheetRepository, "saveWorksheetAnswers").mockRejectedValueOnce(
      Object.assign(new Error("Completed worksheets cannot be changed"), { statusCode: 409 })
    );

    const response = await request(createApp()).patch("/api/worksheets/worksheet-1/save").send({
      answers: [{ questionId: "q-1", answerText: "7" }],
      elapsedSeconds: 0,
      status: "completed"
    });

    expect(response.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run backend tests to verify failure**

Run: `npm run test --workspace backend`

Expected: FAIL because the save route currently accepts save mutations without a completion-specific guard.

- [ ] **Step 3: Add an explicit completed-save rejection in the route**

Update `backend/src/routes/worksheet.routes.ts`:

```ts
worksheetRouter.patch(
  "/:id/save",
  authenticate,
  validateBody(saveWorksheetSchema),
  asyncHandler(async (req, res) => {
    if (req.body.status === "completed") {
      return res.status(409).json({ message: "Completed worksheets cannot be changed" });
    }

    res.json(
      await saveWorksheetAnswers({
        worksheetId: String(req.params.id),
        answers: req.body.answers,
        elapsedSeconds: req.body.elapsedSeconds,
        status: req.body.status
      })
    );
  })
);
```

- [ ] **Step 4: Run backend tests again**

Run: `npm run test --workspace backend`

Expected: PASS, including the new completion-guard test.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/worksheet.routes.ts backend/src/tests/worksheet-save-completion.test.ts
git commit -m "feat: block completed worksheet saves"
```

## Task 4: Redesign the Worksheet Grid for Answer-State Rendering

**Files:**
- Modify: `frontend/src/components/worksheet/WorksheetGrid.vue`
- Modify: `frontend/src/styles/main.css`
- Test: `frontend/src/tests/worksheet-view.test.ts`

- [ ] **Step 1: Run the targeted worksheet view test before editing**

Run: `npm run test --workspace frontend -- src/tests/worksheet-view.test.ts`

Expected: FAIL because the grid does not expose answer-state markers or disabled-state behavior.

- [ ] **Step 2: Add explicit answer-state props and data hooks**

Update `frontend/src/components/worksheet/WorksheetGrid.vue`:

```vue
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
```

- [ ] **Step 3: Add the corresponding visual treatments**

Append to `frontend/src/styles/main.css`:

```css
.worksheet-grid-solve {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.worksheet-answer-card {
  padding: 0;
  background: transparent;
  border: none;
}

.worksheet-answer-shell {
  display: grid;
  gap: 0.8rem;
  padding: 1rem;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--panel);
}

.worksheet-answer-shell-empty {
  border-style: dashed;
  background: rgba(200, 122, 25, 0.08);
}

.worksheet-answer-shell-correct {
  border-color: rgba(45, 138, 90, 0.28);
  background: rgba(45, 138, 90, 0.1);
}

.worksheet-answer-shell-wrong {
  border-color: rgba(187, 63, 63, 0.28);
  background: rgba(187, 63, 63, 0.1);
}
```

- [ ] **Step 4: Run the worksheet view test again**

Run: `npm run test --workspace frontend -- src/tests/worksheet-view.test.ts`

Expected: STILL FAIL because `WorksheetView.vue` is not yet deriving and passing the correct `answerStates`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/worksheet/WorksheetGrid.vue frontend/src/styles/main.css
git commit -m "feat: add worksheet answer-state rendering hooks"
```

## Task 5: Rebuild WorksheetView Into the New Single-Column Flow

**Files:**
- Modify: `frontend/src/views/WorksheetView.vue`
- Modify: `frontend/src/styles/main.css`
- Test: `frontend/src/tests/worksheet-view.test.ts`

- [ ] **Step 1: Run the worksheet view tests before editing**

Run: `npm run test --workspace frontend -- src/tests/worksheet-view.test.ts`

Expected: FAIL because the view still renders header buttons and does not show the new summary/status flow.

- [ ] **Step 2: Implement derived answer states, save status, and bottom submit layout**

Replace the main structure in `frontend/src/views/WorksheetView.vue` with:

```vue
<template>
  <section v-if="worksheet" data-testid="worksheet-page" class="page-stack worksheet-page-shell">
    <header class="worksheet-page-header">
      <div class="worksheet-page-heading">
        <p class="eyebrow">Worksheet</p>
        <h1>{{ worksheet.title }}</h1>
        <p class="lede">{{ worksheet.questions.length }} problems · {{ worksheet.config.difficulty }} difficulty</p>
      </div>
      <p data-testid="worksheet-save-status" class="worksheet-save-status">
        {{ saveStatusLabel }}
      </p>
    </header>

    <WorksheetGrid
      :questions="worksheet.questions"
      :answers="worksheet.answers"
      :answer-states="answerStates"
      :disabled="isCompleted"
      @update-answer="worksheetStore.updateAnswer"
    />

    <section class="worksheet-review-panel" data-testid="worksheet-review-panel">
      <div>
        <h2>{{ isCompleted ? "Completed" : "Review before submit" }}</h2>
        <p v-if="!isCompleted">{{ unansweredCount }} unanswered</p>
        <p v-else>Completed and locked</p>
      </div>
      <button
        v-if="!isCompleted"
        class="button"
        type="button"
        @click="submitWorksheet"
      >
        Submit worksheet
      </button>
    </section>

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
const isCompleted = computed(() => worksheet.value?.status === "completed");
const unansweredCount = computed(() => worksheet.value?.answers.filter((answer) => !String(answer ?? "").trim()).length ?? 0);
const saveStatusLabel = computed(() => {
  if (isCompleted.value) return "Completed and locked";
  if (worksheetStore.saveState === "saving") return "Saving...";
  if (worksheetStore.saveState === "error") return "Save failed";
  if (worksheetStore.saveState === "saved") return "Saved just now";
  if (worksheetStore.saveState === "dirty") return "Saving soon...";
  return "All progress saved";
});
const answerStates = computed(() => {
  if (!worksheet.value) return [];

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
      submittedAt: payload.worksheet.submittedAt,
      result: payload.worksheet.status === "completed"
        ? {
            scoreCorrect: payload.worksheet.scoreCorrect,
            scoreTotal: payload.worksheet.scoreTotal,
            accuracyPercentage: payload.worksheet.accuracyPercentage
          }
        : undefined
    });
  }
});

const submitWorksheet = async () => {
  await worksheetStore.submitActiveWorksheet();
  if (worksheet.value?.source === "local") {
    worksheetStore.saveLocalWorksheet(worksheet.value);
  }
};
</script>
```

- [ ] **Step 3: Add the new page-level styles**

Append to `frontend/src/styles/main.css`:

```css
.worksheet-page-shell {
  gap: 1.5rem;
}

.worksheet-page-header {
  display: grid;
  gap: 0.5rem;
}

.worksheet-save-status {
  color: var(--muted);
  font-weight: 600;
}

.worksheet-review-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 0;
  border-top: 1px solid var(--line);
}

@media (max-width: 800px) {
  .worksheet-review-panel {
    flex-direction: column;
    align-items: start;
  }
}
```

- [ ] **Step 4: Run the worksheet view and full frontend test suites**

Run: `npm run test --workspace frontend -- src/tests/worksheet-view.test.ts && npm run test --workspace frontend`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/WorksheetView.vue frontend/src/styles/main.css frontend/src/tests/worksheet-view.test.ts
git commit -m "feat: redesign worksheet view flow"
```

## Task 6: Update End-to-End Flows for Auto-Save and Locking

**Files:**
- Modify: `e2e/specs/flows/anonymous-worksheet.spec.ts`
- Modify: `e2e/specs/flows/authenticated-worksheet.spec.ts`
- Create: `e2e/specs/flows/completed-worksheet-locking.spec.ts`

- [ ] **Step 1: Write the failing completed-locking E2E spec**

Create `e2e/specs/flows/completed-worksheet-locking.spec.ts`:

```ts
import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("completed worksheets reopen in a locked state", async ({ page }) => {
  await page.goto("/generate");
  await page.getByTestId("generate-submit").click();
  await page.getByTestId("answer-input-1").fill("5");
  await page.getByRole("button", { name: "Submit worksheet" }).click();
  await expect(page.getByText("Completed")).toBeVisible();

  await page.goto("/worksheets");
  await page.getByTestId("saved-local-worksheet-link").first().click();

  await expect(page.getByTestId("worksheet-page")).toBeVisible();
  await expect(page.getByTestId("answer-input-1")).toBeDisabled();
});
```

- [ ] **Step 2: Update the existing anonymous and authenticated flow specs**

Change `e2e/specs/flows/anonymous-worksheet.spec.ts`:

```ts
await page.getByTestId("answer-input-1").fill("5");
await expect(page.getByTestId("worksheet-save-status")).toContainText(/Saving|Saved/);
await expect(page.getByTestId("answer-state-2")).toHaveAttribute("data-answer-state", "empty");
await page.getByRole("button", { name: "Submit worksheet" }).click();
await expect(page.getByTestId("answer-state-1")).toHaveAttribute("data-answer-state", "correct");
```

Change `e2e/specs/flows/authenticated-worksheet.spec.ts`:

```ts
await page.getByTestId("answer-input-1").fill("7");
await expect(page.getByTestId("worksheet-save-status")).toContainText(/Saving|Saved/);
await page.getByRole("button", { name: "Submit worksheet" }).click();
await expect(page.getByText("Completed")).toBeVisible();
await expect(page.getByTestId("answer-input-1")).toBeDisabled();
```

- [ ] **Step 3: Run the targeted E2E specs to verify the current failures**

Run: `npm run test:e2e -- --workers=1 e2e/specs/flows/anonymous-worksheet.spec.ts e2e/specs/flows/authenticated-worksheet.spec.ts e2e/specs/flows/completed-worksheet-locking.spec.ts`

Expected: FAIL until the new UI and locking behavior are fully wired together.

- [ ] **Step 4: Re-run the targeted E2E specs after the UI work**

Run: `npm run test:e2e -- --workers=1 e2e/specs/flows/anonymous-worksheet.spec.ts e2e/specs/flows/authenticated-worksheet.spec.ts e2e/specs/flows/completed-worksheet-locking.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add e2e/specs/flows/anonymous-worksheet.spec.ts e2e/specs/flows/authenticated-worksheet.spec.ts e2e/specs/flows/completed-worksheet-locking.spec.ts
git commit -m "test: cover worksheet autosave and locking flows"
```

## Task 7: Final Verification and Documentation Note

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add one short note about worksheet behavior**

Append this sentence in the worksheet usage section of `README.md`:

```md
Worksheets auto-save while in progress, highlight unanswered problems before submission, reveal correctness only after submission, and lock once completed.
```

- [ ] **Step 2: Run the full verification set**

Run: `npm run test --workspace backend && npm run test --workspace frontend && npm run test:e2e -- --workers=1 e2e/specs/flows/anonymous-worksheet.spec.ts e2e/specs/flows/authenticated-worksheet.spec.ts e2e/specs/flows/completed-worksheet-locking.spec.ts e2e/specs/routes/generator.spec.ts && npm run build --workspace frontend`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add README.md backend/src frontend/src e2e/specs/flows
git commit -m "feat: finalize worksheet solving experience redesign"
```

## Self-Review Checklist

- Spec coverage:
  - single-column worksheet flow: Task 5
  - auto-save and visible save status: Tasks 2 and 5
  - empty-only pre-submit highlighting: Tasks 4 and 5
  - post-submit correctness states: Tasks 4 and 5
  - completed worksheet locking: Tasks 2, 3, 5, and 6
  - signed-in and anonymous verification: Task 6
- Placeholder scan:
  - No `TODO`, `TBD`, or deferred implementation placeholders remain.
  - Each task includes exact files, commands, and concrete code snippets.
- Type consistency:
  - `saveState` values are consistent across the store and view.
  - `answerStates` uses the same `empty | filled | correct | wrong` values in tests, view logic, and grid props.
  - The locking rule uses `status === "completed"` consistently across frontend and backend.

