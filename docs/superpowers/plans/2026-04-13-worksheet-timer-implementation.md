# Worksheet Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live worksheet timer that starts on page load, persists elapsed time for anonymous and signed-in worksheets, and shows final time in worksheet and saved-history UI.

**Architecture:** Reuse the existing `worksheet_attempts.elapsed_seconds` column for signed-in worksheets and add `elapsedSeconds` to the frontend worksheet record for anonymous persistence. The store owns elapsed-time data, the worksheet view owns the active interval lifecycle, and backend list/detail/save routes expose the stored duration so the UI can render it consistently.

**Tech Stack:** Vue 3, Pinia, Express, TypeScript, PostgreSQL, Vitest, Playwright

---

## File Map

**Modify**
- `C:/SL/ailab/_web/mathsheets/frontend/src/stores/worksheet.ts`
- `C:/SL/ailab/_web/mathsheets/frontend/src/views/WorksheetView.vue`
- `C:/SL/ailab/_web/mathsheets/frontend/src/lib/saved-worksheets.ts`
- `C:/SL/ailab/_web/mathsheets/frontend/src/components/worksheet/SavedWorksheetRow.vue`
- `C:/SL/ailab/_web/mathsheets/frontend/src/styles/main.css`
- `C:/SL/ailab/_web/mathsheets/frontend/src/tests/anonymous-worksheets.test.ts`
- `C:/SL/ailab/_web/mathsheets/frontend/src/tests/worksheet-view.test.ts`
- `C:/SL/ailab/_web/mathsheets/frontend/src/tests/saved-worksheets-view.test.ts`
- `C:/SL/ailab/_web/mathsheets/backend/src/repositories/worksheet.repository.ts`
- `C:/SL/ailab/_web/mathsheets/backend/src/tests/worksheet-save-completion.test.ts`
- `C:/SL/ailab/_web/mathsheets/backend/src/tests/worksheet-list.repository.test.ts`
- `C:/SL/ailab/_web/mathsheets/backend/src/tests/worksheet.routes.test.ts`
- `C:/SL/ailab/_web/mathsheets/e2e/specs/flows/anonymous-worksheet.spec.ts`
- `C:/SL/ailab/_web/mathsheets/e2e/specs/flows/authenticated-worksheet.spec.ts`
- `C:/SL/ailab/_web/mathsheets/e2e/specs/routes/saved-worksheets.spec.ts`
- `C:/SL/ailab/_web/mathsheets/README.md`

**Create**
- `C:/SL/ailab/_web/mathsheets/backend/src/tests/worksheet-timer.repository.test.ts`

---

### Task 1: Extend Backend Worksheet Responses To Carry Elapsed Time

**Files:**
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/repositories/worksheet.repository.ts`
- Create: `C:/SL/ailab/_web/mathsheets/backend/src/tests/worksheet-timer.repository.test.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/tests/worksheet-list.repository.test.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/tests/worksheet.routes.test.ts`

- [ ] **Step 1: Write the failing repository test for elapsed time mapping**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../db/pool.js", () => ({
  pool: {
    query: queryMock
  }
}));

describe("worksheet timer repository mapping", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("includes elapsed seconds in worksheet detail responses", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: "worksheet-1",
            title: "Timed Worksheet",
            status: "partial",
            difficulty: "easy",
            problem_count: 4,
            allowed_operations: ["+"],
            number_range_min: 1,
            number_range_max: 10,
            worksheet_size: "small",
            clean_division_only: true,
            source: "generated",
            created_at: "2026-04-13T10:00:00.000Z",
            submitted_at: null,
            elapsed_seconds: 185
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const { getWorksheetDetails } = await import("../repositories/worksheet.repository.js");
    const result = await getWorksheetDetails("worksheet-1", "user-1");

    expect(result.worksheet?.elapsedSeconds).toBe(185);
  });
});
```

- [ ] **Step 2: Run the repository test to verify it fails**

Run: `npm run test --workspace backend -- src/tests/worksheet-timer.repository.test.ts`

Expected: FAIL because `elapsedSeconds` is not yet returned by worksheet detail mapping.

- [ ] **Step 3: Add elapsed-time mapping to worksheet summary/detail helpers**

```ts
const mapWorksheetRow = (row: Record<string, unknown>) => ({
  id: row.id,
  title: row.title,
  status: row.status,
  difficulty: row.difficulty,
  problemCount: row.problem_count,
  allowedOperations: row.allowed_operations,
  numberRangeMin: row.number_range_min,
  numberRangeMax: row.number_range_max,
  worksheetSize: row.worksheet_size,
  cleanDivisionOnly: row.clean_division_only,
  source: row.source,
  createdAt: row.created_at,
  submittedAt: row.submitted_at,
  elapsedSeconds: Number(row.elapsed_seconds ?? 0),
  result:
    row.score_total != null
      ? {
          scoreCorrect: Number(row.score_correct),
          scoreTotal: Number(row.score_total),
          accuracyPercentage: Number(row.accuracy_percentage)
        }
      : undefined
});
```

- [ ] **Step 4: Join the first worksheet attempt when reading detail/list rows**

```ts
const worksheetResult = await pool.query(
  `SELECT w.*,
          att.elapsed_seconds,
          att.score_correct,
          att.score_total,
          att.accuracy_percentage
   FROM worksheets w
   LEFT JOIN LATERAL (
     SELECT elapsed_seconds, score_correct, score_total, accuracy_percentage
     FROM worksheet_attempts
     WHERE worksheet_id = w.id
     ORDER BY started_at ASC
     LIMIT 1
   ) att ON TRUE
   WHERE w.id = $1 AND w.user_id = $2`,
  [worksheetId, userId]
);
```

- [ ] **Step 5: Return elapsed seconds from worksheet list endpoints too**

```ts
const result = await pool.query(
  `SELECT w.*,
          att.elapsed_seconds,
          att.score_correct,
          att.score_total,
          att.accuracy_percentage
   FROM worksheets w
   LEFT JOIN LATERAL (
     SELECT elapsed_seconds, score_correct, score_total, accuracy_percentage
     FROM worksheet_attempts
     WHERE worksheet_id = w.id
     ORDER BY started_at ASC
     LIMIT 1
   ) att ON TRUE
   WHERE w.user_id = $1
   ORDER BY w.created_at DESC`,
  [userId]
);
```

- [ ] **Step 6: Extend route-level tests to expect elapsed time in API payloads**

```ts
expect(response.body.worksheet.elapsedSeconds).toBe(185);
expect(response.body[0].elapsedSeconds).toBe(185);
```

- [ ] **Step 7: Run the backend timer/list tests**

Run: `npm run test --workspace backend -- src/tests/worksheet-timer.repository.test.ts src/tests/worksheet-list.repository.test.ts src/tests/worksheet.routes.test.ts`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add backend/src/repositories/worksheet.repository.ts backend/src/tests/worksheet-timer.repository.test.ts backend/src/tests/worksheet-list.repository.test.ts backend/src/tests/worksheet.routes.test.ts
git commit -m "feat: expose worksheet elapsed time"
```

---

### Task 2: Persist Elapsed Time During Saves And Submission

**Files:**
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/repositories/worksheet.repository.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/tests/worksheet-save-completion.test.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/frontend/src/stores/worksheet.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/frontend/src/tests/anonymous-worksheets.test.ts`

- [ ] **Step 1: Write the failing backend save test for elapsed seconds**

```ts
it("persists elapsed seconds on worksheet saves", async () => {
  queryMock
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce({ rows: [{ id: "worksheet-1", status: "partial" }] })
    .mockResolvedValueOnce({ rows: [{ id: "attempt-1" }] })
    .mockResolvedValueOnce({ rows: [{ id: "question-1" }] })
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce(undefined);

  const { saveWorksheetAnswers } = await import("../repositories/worksheet.repository.js");

  await saveWorksheetAnswers({
    worksheetId: "worksheet-1",
    userId: "user-1",
    answers: [{ questionId: "question-1", answerText: "7" }],
    elapsedSeconds: 92,
    status: "partial"
  });

  expect(queryMock.mock.calls.some((call) => JSON.stringify(call[1]).includes("92"))).toBe(true);
});
```

- [ ] **Step 2: Run the backend save test to verify it fails**

Run: `npm run test --workspace backend -- src/tests/worksheet-save-completion.test.ts`

Expected: FAIL because elapsed seconds are not consistently covered by tests or returned anywhere meaningful.

- [ ] **Step 3: Extend frontend worksheet records with elapsed time**

```ts
export type WorksheetRecord = {
  id: string;
  title: string;
  status: "draft" | "partial" | "completed";
  config: WorksheetConfig;
  questions: WorksheetQuestion[];
  answers: Array<string | null>;
  source: "local" | "remote";
  localImportKey: string;
  createdAt: string;
  submittedAt?: string | null;
  elapsedSeconds: number;
  result?: {
    scoreCorrect: number;
    scoreTotal: number;
    accuracyPercentage: number;
  };
};
```

- [ ] **Step 4: Initialize and persist elapsed time in local worksheet state**

```ts
const buildLocalWorksheet = (payload: {
  title: string;
  config: WorksheetConfig;
  questions: WorksheetQuestion[];
}): WorksheetRecord => ({
  id: randomKey(),
  title: payload.title,
  status: "draft",
  config: payload.config,
  questions: payload.questions,
  answers: payload.questions.map(() => null),
  source: "local",
  localImportKey: randomKey(),
  createdAt: new Date().toISOString(),
  elapsedSeconds: 0
});
```

- [ ] **Step 5: Send elapsed seconds in signed-in save requests and preserve it on submit**

```ts
await apiFetch(`/worksheets/${record.id}/save`, {
  method: "PATCH",
  body: JSON.stringify({
    answers: record.questions.map((question, index) => ({
      questionId: question.id,
      answerText: record.answers[index] ?? ""
    })),
    elapsedSeconds: record.elapsedSeconds,
    status: record.status === "draft" ? "draft" : "partial"
  })
});
```

```ts
const result = await apiFetch<{
  scoreCorrect: number;
  scoreTotal: number;
  accuracyPercentage: number;
  elapsedSeconds: number;
}>(`/worksheets/${this.activeWorksheet.id}/submit`, {
  method: "POST",
  body: JSON.stringify({ answers: this.activeWorksheet.answers })
});

this.activeWorksheet.elapsedSeconds = result.elapsedSeconds;
```

- [ ] **Step 6: Map elapsed seconds from signed-in worksheet detail into the active record**

```ts
worksheetStore.setActiveWorksheet({
  id: payload.worksheet.id,
  title: payload.worksheet.title,
  status: payload.worksheet.status,
  config: { ... },
  questions: payload.questions,
  answers: mappedAnswers,
  source: "remote",
  localImportKey: payload.worksheet.id,
  createdAt: payload.worksheet.createdAt,
  submittedAt: payload.worksheet.submittedAt,
  elapsedSeconds: payload.worksheet.elapsedSeconds ?? 0,
  result: payload.worksheet.status === "completed" ? { ... } : undefined
});
```

- [ ] **Step 7: Add frontend store tests for local elapsed-time persistence**

```ts
expect(worksheetStore.anonymousWorksheets[0].elapsedSeconds).toBe(125);
expect(JSON.parse(String(apiFetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
  elapsedSeconds: 125
});
```

- [ ] **Step 8: Run backend and frontend persistence tests**

Run: `npm run test --workspace backend -- src/tests/worksheet-save-completion.test.ts && npm run test --workspace frontend -- src/tests/anonymous-worksheets.test.ts`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add backend/src/repositories/worksheet.repository.ts backend/src/tests/worksheet-save-completion.test.ts frontend/src/stores/worksheet.ts frontend/src/tests/anonymous-worksheets.test.ts
git commit -m "feat: persist worksheet elapsed time"
```

---

### Task 3: Add A Live Timer To The Worksheet Page

**Files:**
- Modify: `C:/SL/ailab/_web/mathsheets/frontend/src/views/WorksheetView.vue`
- Modify: `C:/SL/ailab/_web/mathsheets/frontend/src/styles/main.css`
- Modify: `C:/SL/ailab/_web/mathsheets/frontend/src/tests/worksheet-view.test.ts`

- [ ] **Step 1: Write the failing worksheet-view timer tests**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("WorksheetView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a live timer that starts immediately", async () => {
    const wrapper = mount(WorksheetView);

    expect(wrapper.text()).toContain("Time: 00:00");
    vi.advanceTimersByTime(3000);
    await nextTick();
    expect(wrapper.text()).toContain("Time: 00:03");
  });

  it("shows completed timing language after submission", async () => {
    const worksheetStore = useWorksheetStore();
    worksheetStore.setActiveWorksheet({
      ...buildWorksheet(),
      status: "completed",
      elapsedSeconds: 142,
      submittedAt: new Date().toISOString(),
      result: {
        scoreCorrect: 2,
        scoreTotal: 4,
        accuracyPercentage: 50
      }
    });

    const wrapper = mount(WorksheetView);
    expect(wrapper.text()).toContain("Completed in 02:22");
  });
});
```

- [ ] **Step 2: Run the worksheet-view tests to verify they fail**

Run: `npm run test --workspace frontend -- src/tests/worksheet-view.test.ts`

Expected: FAIL because no timer is rendered and no interval lifecycle exists.

- [ ] **Step 3: Add a formatting helper and live-timer lifecycle to the worksheet page**

```ts
const formatElapsedTime = (elapsedSeconds: number) => {
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }

  return [minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
};

let timerHandle: ReturnType<typeof setInterval> | null = null;

const startTimer = () => {
  if (!worksheet.value || isCompleted.value || timerHandle) {
    return;
  }

  timerHandle = setInterval(() => {
    if (!worksheet.value || worksheet.value.status === "completed") {
      return;
    }

    worksheet.value.elapsedSeconds += 1;
  }, 1000);
};

const stopTimer = () => {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
};
```

- [ ] **Step 4: Render the timer in the header and completed state**

```vue
<p class="worksheet-time-summary">
  {{ isCompleted ? `Completed in ${formattedElapsedTime}` : `Time: ${formattedElapsedTime}` }}
</p>
```

```ts
const formattedElapsedTime = computed(() => formatElapsedTime(worksheet.value?.elapsedSeconds ?? 0));
```

- [ ] **Step 5: Start the timer on load and stop it on completion/unmount**

```ts
onMounted(async () => {
  // existing worksheet load logic
  startTimer();
});

watch(isCompleted, (completed) => {
  if (completed) {
    stopTimer();
  }
});

onBeforeUnmount(() => {
  stopTimer();
});
```

- [ ] **Step 6: Add compact timer styling**

```css
.worksheet-time-summary {
  color: var(--muted);
  font-weight: 700;
}
```

- [ ] **Step 7: Run the worksheet timer tests and frontend build**

Run: `npm run test --workspace frontend -- src/tests/worksheet-view.test.ts && npm run build --workspace frontend`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add frontend/src/views/WorksheetView.vue frontend/src/styles/main.css frontend/src/tests/worksheet-view.test.ts
git commit -m "feat: add live worksheet timer"
```

---

### Task 4: Show Recorded Time In Saved Worksheets

**Files:**
- Modify: `C:/SL/ailab/_web/mathsheets/frontend/src/lib/saved-worksheets.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/frontend/src/components/worksheet/SavedWorksheetRow.vue`
- Modify: `C:/SL/ailab/_web/mathsheets/frontend/src/tests/saved-worksheets-view.test.ts`

- [ ] **Step 1: Write the failing saved-worksheets timing test**

```ts
it("shows elapsed time metadata for completed and in-progress worksheets", async () => {
  const wrapper = mount(SavedWorksheetsView, {
    global: {
      plugins: [createTestingPinia({
        initialState: {
          worksheet: {
            remoteWorksheets: [
              {
                id: "worksheet-1",
                title: "Timed Worksheet",
                status: "completed",
                difficulty: "easy",
                problemCount: 12,
                allowedOperations: ["+"],
                numberRangeMin: 1,
                numberRangeMax: 10,
                worksheetSize: "medium",
                cleanDivisionOnly: true,
                source: "generated",
                createdAt: "2026-04-13T10:00:00.000Z",
                submittedAt: "2026-04-13T10:05:00.000Z",
                elapsedSeconds: 305,
                result: {
                  scoreCorrect: 12,
                  scoreTotal: 12,
                  accuracyPercentage: 100
                }
              }
            ]
          }
        }
      })]
    }
  });

  expect(wrapper.text()).toContain("Completed in 05:05");
});
```

- [ ] **Step 2: Run the saved-worksheets test to verify it fails**

Run: `npm run test --workspace frontend -- src/tests/saved-worksheets-view.test.ts`

Expected: FAIL because worksheet summaries do not currently carry or render elapsed time.

- [ ] **Step 3: Extend the worksheet summary record type**

```ts
export type WorksheetSummaryRecord = {
  id: string;
  title: string;
  status: "draft" | "partial" | "completed";
  difficulty: "easy" | "medium" | "hard";
  problemCount: number;
  allowedOperations: Array<"+" | "-" | "*" | "/">;
  numberRangeMin: number;
  numberRangeMax: number;
  worksheetSize: "small" | "medium" | "large";
  cleanDivisionOnly: boolean;
  source: "generated" | "imported";
  createdAt: string;
  submittedAt: string | null;
  elapsedSeconds: number;
  result?: {
    scoreCorrect: number;
    scoreTotal: number;
    accuracyPercentage: number;
  };
};
```

- [ ] **Step 4: Add a reusable elapsed-time label helper**

```ts
export const formatElapsedLabel = (status: "draft" | "partial" | "completed", elapsedSeconds: number) => {
  if (!elapsedSeconds) {
    return null;
  }

  const time = formatDuration(elapsedSeconds);
  return status === "completed" ? `Completed in ${time}` : `Worked for ${time}`;
};
```

- [ ] **Step 5: Render elapsed-time metadata in saved worksheet rows**

```vue
<p v-if="elapsedLabel" class="saved-worksheet-row-time">
  {{ elapsedLabel }}
</p>
```

- [ ] **Step 6: Run the saved-worksheets tests**

Run: `npm run test --workspace frontend -- src/tests/saved-worksheets-view.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/saved-worksheets.ts frontend/src/components/worksheet/SavedWorksheetRow.vue frontend/src/tests/saved-worksheets-view.test.ts
git commit -m "feat: show worksheet elapsed time in history"
```

---

### Task 5: End-To-End Regression And Docs

**Files:**
- Modify: `C:/SL/ailab/_web/mathsheets/e2e/specs/flows/anonymous-worksheet.spec.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/e2e/specs/flows/authenticated-worksheet.spec.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/e2e/specs/routes/saved-worksheets.spec.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/README.md`

- [ ] **Step 1: Add E2E checks for the live timer and saved-history time**

```ts
await expect(page.getByText("Time: 00:00")).toBeVisible();
await page.waitForTimeout(2100);
await expect(page.getByText(/Time: 00:0[12]/)).toBeVisible();
```

```ts
await expect(page.getByText(/Completed in 00:/)).toBeVisible();
await expect(page.getByText(/Worked for 00:/)).toBeVisible();
```

- [ ] **Step 2: Document the timer behavior**

```md
- Worksheets start timing immediately on load and save elapsed time with progress.
- Completed worksheets show final time taken in the worksheet view and saved history.
```

- [ ] **Step 3: Run focused E2E flows**

Run: `npm run test:e2e -- --workers=1 e2e/specs/flows/anonymous-worksheet.spec.ts e2e/specs/flows/authenticated-worksheet.spec.ts e2e/specs/routes/saved-worksheets.spec.ts`

Expected: PASS

- [ ] **Step 4: Run final verification**

Run: `npm run test && npm run db:migrate && npm run build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add e2e/specs/flows/anonymous-worksheet.spec.ts e2e/specs/flows/authenticated-worksheet.spec.ts e2e/specs/routes/saved-worksheets.spec.ts README.md
git commit -m "docs: record worksheet timer behavior"
```

---

## Self-Review

- **Spec coverage:** The plan covers live timer start/stop behavior, anonymous and signed-in persistence, backend elapsed-time responses, completed-time wording, saved-history display, and test coverage.
- **Placeholder scan:** No `TBD` or abstract “add tests later” steps remain; each task names exact files, commands, and concrete code snippets.
- **Type consistency:** `elapsedSeconds` is used consistently across backend row mapping, frontend worksheet records, save payloads, and saved worksheet summaries.
