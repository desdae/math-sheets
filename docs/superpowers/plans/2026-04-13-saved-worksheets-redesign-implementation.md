# Saved Worksheets Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the saved worksheets page into a modern timeline-style worksheet library with grouped synced history, richer worksheet metadata, clickable multi-select chip filters, and a separate local import section.

**Architecture:** Keep the current `/worksheets` route and data sources, but move the view to a richer view-model-driven rendering flow. Introduce a small saved-worksheets helper layer for grouping, chip extraction, and filtering so the page stays understandable and the store does not absorb presentation-specific logic.

**Tech Stack:** Vue 3 Composition API, Pinia, Vue Router, Vite, Vitest, Playwright, CSS in `frontend/src/styles/main.css`

---

## File Structure

- `frontend/src/views/SavedWorksheetsView.vue`
  - Main saved-worksheets screen. Will render the editorial header, active filter bar, grouped synced history, and secondary local section.
- `frontend/src/components/worksheet/SavedWorksheetRow.vue`
  - Reusable rich row for both synced and local sections. Owns row-level metadata display and chip click behavior.
- `frontend/src/components/worksheet/SavedWorksheetFilterBar.vue`
  - Displays active filters and `Clear all`.
- `frontend/src/lib/saved-worksheets.ts`
  - Focused helper module for date grouping, chip normalization, filter application, and display formatting.
- `frontend/src/tests/saved-worksheets-view.test.ts`
  - Unit coverage for date groups, filter toggling, local section visibility, and import CTA visibility.
- `e2e/specs/routes/saved-worksheets.spec.ts`
  - Browser coverage for grouped rendering, row navigation, and chip filtering behavior.
- `frontend/src/styles/main.css`
  - Styling for the timeline library layout, row surfaces, chips, and responsive behavior.

## Task 1: Add the Saved Worksheets View Model Helpers

**Files:**
- Create: `frontend/src/lib/saved-worksheets.ts`
- Test: `frontend/src/tests/saved-worksheets-view.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Add focused tests that describe the grouping and filtering behavior before any implementation exists.

```ts
import { describe, expect, it } from "vitest";
import {
  buildWorksheetDateGroups,
  buildWorksheetChips,
  filterWorksheetRecords
} from "../lib/saved-worksheets";

const now = new Date("2026-04-13T10:00:00.000Z");

const records = [
  {
    id: "today-1",
    title: "Mixed Sprint",
    status: "completed",
    difficulty: "medium",
    problemCount: 12,
    allowedOperations: ["+", "/"],
    numberRangeMin: 1,
    numberRangeMax: 100,
    worksheetSize: "medium",
    createdAt: "2026-04-13T08:15:00.000Z",
    submittedAt: "2026-04-13T08:25:00.000Z",
    result: { scoreCorrect: 11, scoreTotal: 12, accuracyPercentage: 91.67 }
  },
  {
    id: "week-1",
    title: "Subtraction Builder",
    status: "partial",
    difficulty: "easy",
    problemCount: 16,
    allowedOperations: ["-"],
    numberRangeMin: 1,
    numberRangeMax: 20,
    worksheetSize: "small",
    createdAt: "2026-04-10T09:00:00.000Z"
  },
  {
    id: "earlier-1",
    title: "Hard Tables",
    status: "completed",
    difficulty: "hard",
    problemCount: 20,
    allowedOperations: ["*"],
    numberRangeMin: 1,
    numberRangeMax: 12,
    worksheetSize: "large",
    createdAt: "2026-04-01T09:00:00.000Z",
    submittedAt: "2026-04-01T09:18:00.000Z"
  }
];

describe("saved-worksheets helpers", () => {
  it("groups synced worksheets into today, this week, and earlier", () => {
    const groups = buildWorksheetDateGroups(records, now);

    expect(groups[0].label).toBe("Today");
    expect(groups[0].items.map((item) => item.id)).toEqual(["today-1"]);
    expect(groups[1].label).toBe("This week");
    expect(groups[1].items.map((item) => item.id)).toEqual(["week-1"]);
    expect(groups[2].label).toBe("Earlier");
    expect(groups[2].items.map((item) => item.id)).toEqual(["earlier-1"]);
  });

  it("builds separate chips for each operation and worksheet facet", () => {
    const chips = buildWorksheetChips(records[0]);

    expect(chips.map((chip) => chip.value)).toContain("completed");
    expect(chips.map((chip) => chip.value)).toContain("medium");
    expect(chips.map((chip) => chip.value)).toContain("addition");
    expect(chips.map((chip) => chip.value)).toContain("division");
    expect(chips.map((chip) => chip.value)).toContain("1-100");
  });

  it("applies multi-select filters across status, difficulty, and operation", () => {
    const filtered = filterWorksheetRecords(records, new Set(["completed", "medium", "addition"]));
    expect(filtered.map((item) => item.id)).toEqual(["today-1"]);
  });
});
```

- [ ] **Step 2: Run the helper tests to verify they fail**

Run: `npm run test --workspace frontend -- src/tests/saved-worksheets-view.test.ts`

Expected: FAIL with missing module or missing exports from `frontend/src/lib/saved-worksheets.ts`.

- [ ] **Step 3: Write the helper module**

Create a focused helper module with stable types and pure functions.

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
  createdAt: string;
  submittedAt?: string | null;
  result?: {
    scoreCorrect: number;
    scoreTotal: number;
    accuracyPercentage: number;
  };
};

export type WorksheetChip = {
  key: string;
  value: string;
  label: string;
  kind: "status" | "difficulty" | "operation" | "range" | "size";
};

export type WorksheetGroup = {
  key: "today" | "week" | "earlier";
  label: "Today" | "This week" | "Earlier";
  items: WorksheetSummaryRecord[];
};
```

Use helpers like:

```ts
const operationLabels = {
  "+": "addition",
  "-": "subtraction",
  "*": "multiplication",
  "/": "division"
} as const;

export const buildWorksheetChips = (record: WorksheetSummaryRecord): WorksheetChip[] => {
  const operationChips = record.allowedOperations.map((operation) => ({
    key: `operation:${operationLabels[operation]}`,
    value: operationLabels[operation],
    label: operationLabels[operation],
    kind: "operation" as const
  }));

  return [
    { key: `status:${record.status}`, value: record.status, label: record.status, kind: "status" },
    { key: `difficulty:${record.difficulty}`, value: record.difficulty, label: record.difficulty, kind: "difficulty" },
    ...operationChips,
    {
      key: `size:${record.worksheetSize}`,
      value: record.worksheetSize,
      label: record.worksheetSize,
      kind: "size"
    },
    {
      key: `range:${record.numberRangeMin}-${record.numberRangeMax}`,
      value: `${record.numberRangeMin}-${record.numberRangeMax}`,
      label: `${record.numberRangeMin}-${record.numberRangeMax}`,
      kind: "range"
    }
  ];
};
```

And the grouping/filtering logic:

```ts
export const filterWorksheetRecords = (records: WorksheetSummaryRecord[], activeFilters: Set<string>) => {
  if (activeFilters.size === 0) {
    return records;
  }

  return records.filter((record) => {
    const values = new Set(buildWorksheetChips(record).map((chip) => chip.value));
    return Array.from(activeFilters).every((value) => values.has(value));
  });
};
```

- [ ] **Step 4: Run the helper tests to verify they pass**

Run: `npm run test --workspace frontend -- src/tests/saved-worksheets-view.test.ts`

Expected: PASS for the helper grouping/filtering tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/saved-worksheets.ts frontend/src/tests/saved-worksheets-view.test.ts
git commit -m "Add saved worksheet grouping helpers"
```

## Task 2: Build the Rich Worksheet Row and Filter Bar Components

**Files:**
- Create: `frontend/src/components/worksheet/SavedWorksheetRow.vue`
- Create: `frontend/src/components/worksheet/SavedWorksheetFilterBar.vue`
- Modify: `frontend/src/tests/saved-worksheets-view.test.ts`

- [ ] **Step 1: Extend the failing view test for row metadata and filter interactions**

Add tests that describe the new row content and chip interaction behavior.

```ts
it("renders worksheet metadata chips and score badges for completed rows", async () => {
  const wrapper = mount(SavedWorksheetsView, { global: { plugins: [createPinia(), router] } });

  expect(wrapper.text()).toContain("92%");
  expect(wrapper.text()).toContain("completed");
  expect(wrapper.text()).toContain("medium");
  expect(wrapper.text()).toContain("addition");
});

it("toggles a chip filter without navigating", async () => {
  const push = vi.fn();
  const wrapper = mount(SavedWorksheetsView, {
    global: {
      plugins: [createPinia()],
      mocks: { $router: { push } }
    }
  });

  await wrapper.get('[data-testid="worksheet-chip-addition"]').trigger("click");

  expect(push).not.toHaveBeenCalled();
  expect(wrapper.get('[data-testid="active-filter-addition"]').exists()).toBe(true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test --workspace frontend -- src/tests/saved-worksheets-view.test.ts`

Expected: FAIL because the new row and filter bar components do not exist and the new selectors are missing.

- [ ] **Step 3: Create the reusable row and filter bar components**

`SavedWorksheetRow.vue` should:

- accept a worksheet summary record
- render title, supporting date/count line, status chip, optional score badge, and metadata chips
- emit `open` when the row shell is clicked
- emit `toggle-filter` when a chip is clicked

Example script shape:

```vue
<script setup lang="ts">
import { computed } from "vue";
import { buildWorksheetChips, formatWorksheetTimestamp, type WorksheetSummaryRecord } from "../../lib/saved-worksheets";

const props = defineProps<{
  worksheet: WorksheetSummaryRecord;
  activeFilters: Set<string>;
  scope: "synced" | "local";
}>();

const emit = defineEmits<{
  open: [worksheetId: string];
  "toggle-filter": [value: string];
}>();

const chips = computed(() => buildWorksheetChips(props.worksheet));
</script>
```

Important click handler:

```vue
<button
  v-for="chip in chips"
  :key="chip.key"
  :data-testid="`worksheet-chip-${chip.value}`"
  class="worksheet-meta-chip"
  :class="{ 'worksheet-meta-chip-active': activeFilters.has(chip.value) }"
  @click.stop="$emit('toggle-filter', chip.value)"
>
  {{ chip.label }}
</button>
```

`SavedWorksheetFilterBar.vue` should:

- accept `activeFilters`
- render removable active chips
- render `Clear all`

```vue
<button
  v-for="value in activeFilters"
  :key="value"
  :data-testid="`active-filter-${value}`"
  class="worksheet-filter-chip worksheet-filter-chip-active"
  @click="$emit('remove', value)"
>
  {{ value }}
</button>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace frontend -- src/tests/saved-worksheets-view.test.ts`

Expected: PASS for the new component-level metadata/filter interaction checks.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/worksheet/SavedWorksheetRow.vue frontend/src/components/worksheet/SavedWorksheetFilterBar.vue frontend/src/tests/saved-worksheets-view.test.ts
git commit -m "Add saved worksheet row components"
```

## Task 3: Rebuild the Saved Worksheets View Around the Timeline Library

**Files:**
- Modify: `frontend/src/views/SavedWorksheetsView.vue`
- Modify: `frontend/src/tests/saved-worksheets-view.test.ts`

- [ ] **Step 1: Expand the failing view test to cover grouping, local visibility, and import CTA rules**

Add tests for the full page behavior.

```ts
it("shows synced worksheets grouped into today, this week, and earlier", async () => {
  const wrapper = mount(SavedWorksheetsView, { global: { plugins: [createPinia()] } });

  expect(wrapper.text()).toContain("Today");
  expect(wrapper.text()).toContain("This week");
  expect(wrapper.text()).toContain("Earlier");
});

it("hides the local section entirely when there are no local worksheets", async () => {
  const worksheetStore = useWorksheetStore();
  worksheetStore.anonymousWorksheets = [];

  const wrapper = mount(SavedWorksheetsView, { global: { plugins: [createPinia()] } });

  expect(wrapper.text()).not.toContain("Local on this device");
});

it("shows the import action only when signed in and local worksheets exist", async () => {
  const authStore = useAuthStore();
  authStore.user = { id: "user-1", displayName: "Test User", email: "test@example.com", avatarUrl: null };

  const wrapper = mount(SavedWorksheetsView, { global: { plugins: [createPinia()] } });

  expect(wrapper.text()).toContain("Import new local worksheets");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test --workspace frontend -- src/tests/saved-worksheets-view.test.ts`

Expected: FAIL because the current page is still a flat two-column list without date grouping or filter state.

- [ ] **Step 3: Rebuild `SavedWorksheetsView.vue` with a local view model**

Key local state:

```ts
const activeFilters = ref<Set<string>>(new Set());

const toggleFilter = (value: string) => {
  const next = new Set(activeFilters.value);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  activeFilters.value = next;
};

const clearFilters = () => {
  activeFilters.value = new Set();
};
```

Build the synced pipeline locally:

```ts
const syncedRecords = computed(() => worksheetStore.remoteWorksheets as WorksheetSummaryRecord[]);
const filteredSyncedRecords = computed(() => filterWorksheetRecords(syncedRecords.value, activeFilters.value));
const syncedGroups = computed(() => buildWorksheetDateGroups(filteredSyncedRecords.value, new Date()));
const hasFilteredResults = computed(() => filteredSyncedRecords.value.length > 0);
```

Template structure:

```vue
<section data-testid="saved-worksheets-page" class="page-stack saved-library-page">
  <header class="saved-library-hero">
    <p class="eyebrow">Saved worksheets</p>
    <h1>Your worksheet library</h1>
    <p class="lede">Browse recent practice by day, reopen unfinished work, and filter by the skills you want to revisit.</p>
  </header>

  <SavedWorksheetFilterBar
    v-if="activeFilters.size > 0"
    :active-filters="activeFilters"
    @remove="toggleFilter"
    @clear="clearFilters"
  />

  <section class="saved-library-section">
    <div class="saved-library-section-header">
      <div>
        <p class="eyebrow">Synced worksheets</p>
        <h2>Recent history</h2>
      </div>
    </div>

    <div v-for="group in syncedGroups" :key="group.key" class="saved-library-group">
      <div class="saved-library-group-header">
        <h3>{{ group.label }}</h3>
        <span>{{ group.items.length }} worksheets</span>
      </div>

      <SavedWorksheetRow
        v-for="worksheet in group.items"
        :key="worksheet.id"
        :worksheet="worksheet"
        :active-filters="activeFilters"
        scope="synced"
        @open="openWorksheet"
        @toggle-filter="toggleFilter"
      />
    </div>
  </section>
</section>
```

Handle filtered-empty and base-empty separately so a signed-in user with no history sees the normal empty state, but active filters show the reset state instead.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace frontend -- src/tests/saved-worksheets-view.test.ts`

Expected: PASS for grouping, local visibility, import CTA, and filter behavior.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/SavedWorksheetsView.vue frontend/src/tests/saved-worksheets-view.test.ts
git commit -m "Redesign saved worksheets view"
```

## Task 4: Style the Timeline Library and Responsive Rows

**Files:**
- Modify: `frontend/src/styles/main.css`
- Test: `frontend/src/tests/saved-worksheets-view.test.ts`

- [ ] **Step 1: Add a small failing selector/style smoke assertion if one is needed**

If the test file does not already assert the key class hooks, add one simple assertion:

```ts
it("applies the saved library layout hooks", async () => {
  const wrapper = mount(SavedWorksheetsView, { global: { plugins: [createPinia()] } });
  expect(wrapper.get('[data-testid="saved-worksheets-page"]').classes()).toContain("saved-library-page");
});
```

- [ ] **Step 2: Run the test to verify it fails if the hook is missing**

Run: `npm run test --workspace frontend -- src/tests/saved-worksheets-view.test.ts`

Expected: FAIL only if the hook is not already present.

- [ ] **Step 3: Add the new page, row, and chip styling**

Add focused styles for:

- `.saved-library-page`
- `.saved-library-hero`
- `.saved-library-section`
- `.saved-library-group`
- `.saved-library-group-header`
- `.saved-worksheet-row`
- `.saved-worksheet-row-top`
- `.saved-worksheet-row-meta`
- `.worksheet-meta-chip`
- `.worksheet-meta-chip-active`
- `.saved-library-filter-bar`
- `.saved-library-empty`

Example direction:

```css
.saved-library-page {
  gap: 1.5rem;
}

.saved-library-group {
  display: grid;
  gap: 0.85rem;
}

.saved-worksheet-row {
  display: grid;
  gap: 0.9rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: rgba(255, 253, 248, 0.92);
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
}

.saved-worksheet-row:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}

.worksheet-meta-chip {
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  background: #f7f1ea;
  color: var(--text);
  font-size: 0.82rem;
  font-weight: 700;
}

.worksheet-meta-chip-active {
  background: var(--accent-soft);
  color: var(--accent);
}
```

Add a responsive collapse under the existing mobile breakpoint so rows stack cleanly and chips wrap without clipping.

- [ ] **Step 4: Run the tests and build to verify nothing regressed**

Run:

- `npm run test --workspace frontend -- src/tests/saved-worksheets-view.test.ts`
- `npm run build --workspace frontend`

Expected: PASS, and the frontend build completes successfully.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles/main.css frontend/src/tests/saved-worksheets-view.test.ts
git commit -m "Style saved worksheet timeline"
```

## Task 5: Add Playwright Coverage for Grouping and Filter Interactions

**Files:**
- Modify: `e2e/specs/routes/saved-worksheets.spec.ts`
- Modify: `backend/src/routes/test-auth.routes.ts` (only if test fixtures need additional worksheet summary fields)

- [ ] **Step 1: Write the failing Playwright assertions**

Add browser coverage that seeds synced and local worksheets, then verifies:

```ts
test("groups synced worksheets by date and filters by metadata chips", async ({ page }) => {
  await page.goto("/worksheets");

  await expect(page.getByText("Today")).toBeVisible();
  await expect(page.getByText("This week")).toBeVisible();
  await expect(page.getByText("Earlier")).toBeVisible();

  await page.getByTestId("worksheet-chip-addition").first().click();
  await expect(page.getByTestId("active-filter-addition")).toBeVisible();
  await expect(page.getByTestId("saved-remote-worksheet-link")).toHaveCount(1);
});

test("keeps chip clicks from navigating and row clicks still open the worksheet", async ({ page }) => {
  await page.goto("/worksheets");
  await page.getByTestId("worksheet-chip-medium").first().click();
  await expect(page).toHaveURL(/\/worksheets$/);

  await page.getByTestId("saved-remote-worksheet-link").first().click();
  await expect(page).toHaveURL(/\/worksheets\/.+/);
});
```

- [ ] **Step 2: Run the Playwright spec to verify it fails**

Run: `npm run test:e2e -- e2e/specs/routes/saved-worksheets.spec.ts`

Expected: FAIL because the current page lacks grouped headings and chip-based filtering.

- [ ] **Step 3: Adjust fixtures only if needed**

If the Playwright test-only fixtures do not include enough metadata to show completed scores cleanly, extend the seed payload with fields that already exist in production shape. Keep this minimal and do not add backend product behavior for the sake of tests alone.

- [ ] **Step 4: Run the Playwright spec to verify it passes**

Run: `npm run test:e2e -- e2e/specs/routes/saved-worksheets.spec.ts`

Expected: PASS with grouped headings, active filters, non-navigating chip clicks, and working row navigation.

- [ ] **Step 5: Commit**

```bash
git add e2e/specs/routes/saved-worksheets.spec.ts backend/src/routes/test-auth.routes.ts
git commit -m "Cover saved worksheet timeline in e2e"
```

## Task 6: Final Verification and Docs Touch-Up

**Files:**
- Modify: `README.md` (only if the saved worksheets behavior is documented)

- [ ] **Step 1: Add a short README note if needed**

If the README already has a page/features list, add one concise line describing the saved-history behavior:

```md
- Saved worksheets are grouped into recent timeline sections and can be filtered by status, difficulty, operation, and worksheet size.
```

- [ ] **Step 2: Run the final verification set**

Run:

- `npm run test --workspace frontend`
- `npm run build --workspace frontend`
- `npm run test:e2e -- e2e/specs/routes/saved-worksheets.spec.ts`

Expected: all pass.

- [ ] **Step 3: Review against the spec**

Confirm the implementation includes:

- separate synced/local sections
- `Today / This week / Earlier`
- clickable multi-select chips
- `Clear all`
- local import CTA rules
- score/date/tag rich rows
- responsive stacked behavior

- [ ] **Step 4: Commit**

```bash
git add README.md frontend/src/views/SavedWorksheetsView.vue frontend/src/components/worksheet/SavedWorksheetRow.vue frontend/src/components/worksheet/SavedWorksheetFilterBar.vue frontend/src/lib/saved-worksheets.ts frontend/src/styles/main.css frontend/src/tests/saved-worksheets-view.test.ts e2e/specs/routes/saved-worksheets.spec.ts
git commit -m "Finish saved worksheets redesign"
```

## Self-Review

### Spec Coverage

- Timeline grouping: covered in Tasks 1, 3, and 5
- Rich worksheet rows with metadata and scores: covered in Tasks 2 and 3
- Multi-select chip filters and clear-all: covered in Tasks 1, 2, 3, and 5
- Separate local section and import rules: covered in Task 3 and Task 5
- Responsive, modern styling: covered in Task 4
- Unit and Playwright coverage: covered in Tasks 1, 2, 3, and 5

### Placeholder Scan

No `TODO`, `TBD`, or “write tests later” placeholders remain. Each task includes exact files, commands, and concrete code shapes.

### Type Consistency

The plan consistently uses:

- `WorksheetSummaryRecord`
- `WorksheetChip`
- `WorksheetGroup`
- `buildWorksheetDateGroups`
- `buildWorksheetChips`
- `filterWorksheetRecords`

These names are introduced in Task 1 and reused consistently in later tasks.
