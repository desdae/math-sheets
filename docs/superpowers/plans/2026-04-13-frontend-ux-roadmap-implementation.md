# Frontend UX Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve MathSheets' end-to-end user experience by tightening onboarding, clarifying the dashboard and worksheet flow, strengthening saved-history retrieval and leaderboard motivation, and polishing navigation and visual hierarchy.

**Architecture:** Keep the current Vue 3 + Pinia + Vue Router structure, but reorganize the frontend around clearer journey stages: onboarding, working surface, retrieval, and motivation. Reuse the existing stores and route model wherever possible, introduce only small presentational components/helpers, and favor progressive refinement of existing pages over heavy rewrites.

**Tech Stack:** Vue 3 Composition API, Vite, Pinia, Vue Router, Vitest, Playwright, existing CSS system in `frontend/src/styles/main.css`

---

## File Structure Map

**Existing files to modify**
- `frontend/src/views/AuthCallbackView.vue`
  Purpose: redirect and post-login orchestration
- `frontend/src/views/CompleteProfileView.vue`
  Purpose: first-run nickname/privacy onboarding
- `frontend/src/components/common/ImportLocalProgressModal.vue`
  Purpose: current import decision UI, likely replaced or reduced
- `frontend/src/views/DashboardView.vue`
  Purpose: signed-in and anonymous home surface
- `frontend/src/views/WorksheetView.vue`
  Purpose: solving flow and completion state
- `frontend/src/components/worksheet/WorksheetGrid.vue`
  Purpose: answer grid and response-state rendering
- `frontend/src/views/SavedWorksheetsView.vue`
  Purpose: saved-history retrieval experience
- `frontend/src/components/worksheet/SavedWorksheetRow.vue`
  Purpose: saved worksheet row surface
- `frontend/src/components/worksheet/SavedWorksheetFilterBar.vue`
  Purpose: active/quick filter UI
- `frontend/src/views/LeaderboardView.vue`
  Purpose: leaderboard filters, user ranking context, empty states
- `frontend/src/components/leaderboard/LeaderboardTable.vue`
  Purpose: leaderboard table/pinned-row rendering
- `frontend/src/views/ProfileView.vue`
  Purpose: public/private identity controls
- `frontend/src/components/layout/AppHeader.vue`
  Purpose: top-level navigation and primary action
- `frontend/src/styles/main.css`
  Purpose: shared visual language and responsive behavior

**Likely new files**
- `frontend/src/components/onboarding/AuthOnboardingFlow.vue`
  Purpose: unified post-Google onboarding stepper
- `frontend/src/components/dashboard/NextActionPanel.vue`
  Purpose: dominant dashboard CTA surface
- `frontend/src/components/dashboard/RecentActivityList.vue`
  Purpose: compact recent local/synced activity list
- `frontend/src/components/worksheet/WorksheetCompletionActions.vue`
  Purpose: reusable post-submit action area
- `frontend/src/components/worksheet/SavedWorksheetQuickFilters.vue`
  Purpose: always-visible top-level saved-library filters
- `frontend/src/components/leaderboard/LeaderboardSummaryCard.vue`
  Purpose: current-user ranking summary or not-ranked guidance
- `frontend/src/components/profile/PublicIdentityPreview.vue`
  Purpose: nickname privacy preview
- `frontend/src/lib/leaderboard.ts`
  Purpose: small helpers for rank/pinned-row/threshold messaging if the logic grows

**Tests to modify or add**
- `frontend/src/tests/dashboard-view.test.ts`
- `frontend/src/tests/worksheet-view.test.ts`
- `frontend/src/tests/saved-worksheets-view.test.ts`
- `frontend/src/tests/profile-view.test.ts`
- `frontend/src/tests/leaderboard-view.test.ts`
- `e2e/specs/flows/nickname-onboarding.spec.ts`
- `e2e/specs/flows/import-local-progress.spec.ts`
- `e2e/specs/routes/dashboard.spec.ts`
- `e2e/specs/routes/saved-worksheets.spec.ts`
- `e2e/specs/routes/leaderboard.spec.ts`

## Delivery Order

1. Post-Google onboarding flow
2. Dashboard redesign
3. Worksheet completion and progress clarity
4. Saved worksheets discoverability improvements
5. Leaderboard motivation redesign
6. Profile privacy clarity
7. Navigation and global polish

---

### Task 1: Unify Post-Google Onboarding

**Files:**
- Create: `frontend/src/components/onboarding/AuthOnboardingFlow.vue`
- Modify: `frontend/src/views/AuthCallbackView.vue`
- Modify: `frontend/src/views/CompleteProfileView.vue`
- Modify: `frontend/src/components/common/ImportLocalProgressModal.vue`
- Test: `frontend/src/tests/complete-profile-view.test.ts`
- Test: `e2e/specs/flows/nickname-onboarding.spec.ts`
- Test: `e2e/specs/flows/import-local-progress.spec.ts`

- [ ] **Step 1: Write the failing onboarding component/unit test**

```ts
import { render, screen } from "@testing-library/vue";
import AuthOnboardingFlow from "../components/onboarding/AuthOnboardingFlow.vue";

test("shows nickname step before import step when nickname is missing", () => {
  render(AuthOnboardingFlow, {
    props: {
      step: "nickname",
      hasLocalWorksheets: true
    }
  });

  expect(screen.getByText("Choose your public nickname")).toBeInTheDocument();
  expect(screen.getByText("Import local worksheets")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace frontend -- src/tests/complete-profile-view.test.ts`
Expected: FAIL because the new onboarding flow component and step UI do not exist yet.

- [ ] **Step 3: Add the unified onboarding flow component**

```vue
<template>
  <section class="card onboarding-flow">
    <div class="onboarding-steps">
      <span :class="{ active: step === 'account' }">1. Connect account</span>
      <span :class="{ active: step === 'nickname' }">2. Public nickname</span>
      <span :class="{ active: step === 'import' }">3. Import local work</span>
      <span :class="{ active: step === 'done' }">4. Go to dashboard</span>
    </div>
    <slot />
  </section>
</template>
```

- [ ] **Step 4: Refactor auth callback and complete-profile screens to use the same staged flow**

```ts
// AuthCallbackView.vue
if (authStore.needsNickname) {
  await router.replace("/complete-profile?step=nickname");
  return;
}

if (worksheetStore.hasImportableAnonymousWorksheets) {
  await router.replace("/complete-profile?step=import");
  return;
}

await router.replace("/dashboard");
```

```ts
// CompleteProfileView.vue
const currentStep = computed(() =>
  authStore.needsNickname ? "nickname" : worksheetStore.hasImportableAnonymousWorksheets ? "import" : "done"
);
```

- [ ] **Step 5: Replace the interruptive import modal with inline onboarding UI**

```vue
<AuthOnboardingFlow :step="currentStep" :has-local-worksheets="worksheetStore.hasImportableAnonymousWorksheets">
  <template v-if="currentStep === 'nickname'">
    <!-- existing nickname form -->
  </template>
  <template v-else-if="currentStep === 'import'">
    <!-- import choice panel with confirm/skip buttons -->
  </template>
</AuthOnboardingFlow>
```

- [ ] **Step 6: Run unit and E2E tests**

Run:
- `npm run test --workspace frontend -- src/tests/complete-profile-view.test.ts`
- `npm run test:e2e -- --workers=1 e2e/specs/flows/nickname-onboarding.spec.ts e2e/specs/flows/import-local-progress.spec.ts`

Expected: PASS, and the onboarding flow is linear instead of modal/interruption based.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/onboarding/AuthOnboardingFlow.vue frontend/src/views/AuthCallbackView.vue frontend/src/views/CompleteProfileView.vue frontend/src/components/common/ImportLocalProgressModal.vue frontend/src/tests/complete-profile-view.test.ts e2e/specs/flows/nickname-onboarding.spec.ts e2e/specs/flows/import-local-progress.spec.ts
git commit -m "Unify post-login onboarding flow"
```

---

### Task 2: Rebuild Dashboard Around One Primary Next Action

**Files:**
- Create: `frontend/src/components/dashboard/NextActionPanel.vue`
- Create: `frontend/src/components/dashboard/RecentActivityList.vue`
- Modify: `frontend/src/views/DashboardView.vue`
- Modify: `frontend/src/styles/main.css`
- Test: `frontend/src/tests/dashboard-view.test.ts`
- Test: `e2e/specs/routes/dashboard.spec.ts`

- [ ] **Step 1: Write the failing dashboard test**

```ts
test("prioritizes resume when unfinished work exists", async () => {
  render(DashboardView, {
    global: {
      plugins: [piniaWithWorksheetState({
        anonymousWorksheets: [{ id: "w1", status: "partial", title: "Easy Practice" }]
      })]
    }
  });

  expect(screen.getByRole("link", { name: /resume worksheet/i })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /new worksheet/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace frontend -- src/tests/dashboard-view.test.ts`
Expected: FAIL because the dashboard still renders the old two-column history layout.

- [ ] **Step 3: Add a dedicated next-action component**

```vue
<template>
  <section class="dashboard-next-action">
    <p class="eyebrow">{{ eyebrow }}</p>
    <h2>{{ title }}</h2>
    <p class="lede">{{ description }}</p>
    <RouterLink class="button" :to="to">{{ cta }}</RouterLink>
  </section>
</template>
```

- [ ] **Step 4: Replace the dashboard split layout with a primary workspace and compact recent activity**

```vue
<NextActionPanel
  :eyebrow="nextAction.eyebrow"
  :title="nextAction.title"
  :description="nextAction.description"
  :cta="nextAction.cta"
  :to="nextAction.to"
/>

<div v-if="stats" class="dashboard-stats-strip">
  <!-- compact StatCard row -->
</div>

<RecentActivityList
  :local-items="worksheetStore.anonymousWorksheets.slice(0, 3)"
  :remote-items="worksheetStore.remoteWorksheets.slice(0, 5)"
/>
```

- [ ] **Step 5: Add dashboard logic for next action selection**

```ts
const latestUnfinishedWorksheet = computed(() =>
  [...worksheetStore.remoteWorksheets, ...worksheetStore.anonymousWorksheets]
    .find((worksheet) => worksheet.status !== "completed")
);

const nextAction = computed(() =>
  latestUnfinishedWorksheet.value
    ? {
        eyebrow: "Continue practicing",
        title: latestUnfinishedWorksheet.value.title,
        description: "Pick up where you left off.",
        cta: "Resume worksheet",
        to: `/worksheets/${latestUnfinishedWorksheet.value.id}`
      }
    : {
        eyebrow: "Start fresh",
        title: "Create a new worksheet",
        description: "Generate a printable set that matches today's practice goal.",
        cta: "New worksheet",
        to: "/generate"
      }
);
```

- [ ] **Step 6: Verify unit and route coverage**

Run:
- `npm run test --workspace frontend -- src/tests/dashboard-view.test.ts`
- `npm run test:e2e -- e2e/specs/routes/dashboard.spec.ts`

Expected: PASS, with a single dominant dashboard CTA.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/dashboard/NextActionPanel.vue frontend/src/components/dashboard/RecentActivityList.vue frontend/src/views/DashboardView.vue frontend/src/styles/main.css frontend/src/tests/dashboard-view.test.ts e2e/specs/routes/dashboard.spec.ts
git commit -m "Refocus dashboard around next action"
```

---

### Task 3: Improve Worksheet Solving and Completion UX

**Files:**
- Create: `frontend/src/components/worksheet/WorksheetCompletionActions.vue`
- Modify: `frontend/src/views/WorksheetView.vue`
- Modify: `frontend/src/components/worksheet/WorksheetGrid.vue`
- Modify: `frontend/src/styles/main.css`
- Test: `frontend/src/tests/worksheet-view.test.ts`
- Test: `e2e/specs/flows/anonymous-worksheet.spec.ts`

- [ ] **Step 1: Write the failing worksheet test**

```ts
test("shows answered progress and post-submit next actions", async () => {
  render(WorksheetView, {
    global: worksheetViewTestSetup({
      answers: ["3", "", "5"],
      status: "completed"
    })
  });

  expect(screen.getByText("2 of 3 answered")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /back to library/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /generate another/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace frontend -- src/tests/worksheet-view.test.ts`
Expected: FAIL because the page does not yet expose a progress summary or post-submit action cluster.

- [ ] **Step 3: Add a solving progress summary**

```ts
const answeredCount = computed(
  () => worksheet.value?.answers.filter((answer) => String(answer ?? "").trim()).length ?? 0
);
```

```vue
<p class="worksheet-progress-summary">
  {{ answeredCount }} of {{ worksheet.questions.length }} answered
</p>
<div class="worksheet-progress-bar">
  <span :style="{ width: `${(answeredCount / worksheet.questions.length) * 100}%` }" />
</div>
```

- [ ] **Step 4: Extract post-submit actions into a dedicated component**

```vue
<WorksheetCompletionActions
  v-if="isCompleted"
  :worksheet-id="worksheet.id"
  @generate-another="router.push('/generate')"
/>
```

- [ ] **Step 5: Tighten the visual states in the answer grid**

```vue
<div
  :class="[
    'worksheet-answer-shell',
    answerState === 'empty' && 'worksheet-answer-shell-empty',
    answerState === 'correct' && 'worksheet-answer-shell-correct',
    answerState === 'wrong' && 'worksheet-answer-shell-wrong'
  ]"
>
```

Add CSS so `empty` is calmer than `wrong`, and `correct` uses clearer positive affordance.

- [ ] **Step 6: Verify regression coverage**

Run:
- `npm run test --workspace frontend -- src/tests/worksheet-view.test.ts`
- `npm run test:e2e -- --workers=1 e2e/specs/flows/anonymous-worksheet.spec.ts`

Expected: PASS, with clearer progress while solving and stronger closure after submission.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/worksheet/WorksheetCompletionActions.vue frontend/src/views/WorksheetView.vue frontend/src/components/worksheet/WorksheetGrid.vue frontend/src/styles/main.css frontend/src/tests/worksheet-view.test.ts e2e/specs/flows/anonymous-worksheet.spec.ts
git commit -m "Improve worksheet progress and completion flow"
```

---

### Task 4: Make Saved Worksheet Filtering Discoverable

**Files:**
- Create: `frontend/src/components/worksheet/SavedWorksheetQuickFilters.vue`
- Modify: `frontend/src/views/SavedWorksheetsView.vue`
- Modify: `frontend/src/components/worksheet/SavedWorksheetRow.vue`
- Modify: `frontend/src/components/worksheet/SavedWorksheetFilterBar.vue`
- Modify: `frontend/src/styles/main.css`
- Test: `frontend/src/tests/saved-worksheets-view.test.ts`
- Test: `e2e/specs/routes/saved-worksheets.spec.ts`

- [ ] **Step 1: Write the failing saved-library test**

```ts
test("shows quick filters before any chip interaction", () => {
  render(SavedWorksheetsView, {
    global: savedWorksheetTestSetup()
  });

  expect(screen.getByRole("button", { name: /in progress/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /completed/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace frontend -- src/tests/saved-worksheets-view.test.ts`
Expected: FAIL because top-level quick filters are not rendered yet.

- [ ] **Step 3: Add a reusable quick-filter strip**

```vue
<template>
  <div class="saved-library-quick-filters">
    <button
      v-for="filter in filters"
      :key="filter.value"
      class="worksheet-filter-chip"
      :class="{ 'worksheet-filter-chip-active': activeFilters.has(filter.value) }"
      @click="$emit('toggle', filter.value)"
    >
      {{ filter.label }}
    </button>
  </div>
</template>
```

- [ ] **Step 4: Add visible presets to the top of the saved library**

```ts
const quickFilters = [
  { value: "status:partial", label: "In progress" },
  { value: "status:completed", label: "Completed" },
  { value: "date:today", label: "Today" },
  { value: "date:this-week", label: "This week" },
  { value: "op:+", label: "Addition" },
  { value: "op:*", label: "Multiplication" }
];
```

```vue
<SavedWorksheetQuickFilters
  :filters="quickFilters"
  :active-filters="activeFilters"
  @toggle="toggleFilter"
/>
```

- [ ] **Step 5: Add clearer row actions**

```vue
<button class="saved-worksheet-row-action">
  {{ worksheet.status === 'completed' ? 'Review results' : 'Resume' }}
</button>
```

Keep chip clicks non-navigational and body click navigational.

- [ ] **Step 6: Verify tests**

Run:
- `npm run test --workspace frontend -- src/tests/saved-worksheets-view.test.ts`
- `npm run test:e2e -- e2e/specs/routes/saved-worksheets.spec.ts`

Expected: PASS, and filters are visible without needing discovery through row chips.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/worksheet/SavedWorksheetQuickFilters.vue frontend/src/views/SavedWorksheetsView.vue frontend/src/components/worksheet/SavedWorksheetRow.vue frontend/src/components/worksheet/SavedWorksheetFilterBar.vue frontend/src/styles/main.css frontend/src/tests/saved-worksheets-view.test.ts e2e/specs/routes/saved-worksheets.spec.ts
git commit -m "Expose saved worksheet quick filters"
```

---

### Task 5: Turn the Leaderboard Into a Motivational Surface

**Files:**
- Create: `frontend/src/components/leaderboard/LeaderboardSummaryCard.vue`
- Modify: `frontend/src/views/LeaderboardView.vue`
- Modify: `frontend/src/components/leaderboard/LeaderboardTable.vue`
- Create: `frontend/src/lib/leaderboard.ts`
- Modify: `frontend/src/styles/main.css`
- Test: `frontend/src/tests/leaderboard-view.test.ts`
- Test: `e2e/specs/routes/leaderboard.spec.ts`

- [ ] **Step 1: Write the failing leaderboard test**

```ts
test("shows current user rank summary when signed in", async () => {
  render(LeaderboardView, {
    global: leaderboardViewTestSetup({
      user: { publicNickname: "des" },
      rows: [
        { user_id: "1", public_nickname: "des", worksheets_completed: 1, problems_solved: 12, accuracy_percentage: 8.33 }
      ]
    })
  });

  expect(screen.getByText(/your rank/i)).toBeInTheDocument();
  expect(screen.getByText(/#1/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace frontend -- src/tests/leaderboard-view.test.ts`
Expected: FAIL because the page currently renders only filters and a table.

- [ ] **Step 3: Add rank/presence helpers**

```ts
export const findCurrentUserRank = (rows, publicNickname) =>
  rows.findIndex((row) => row.public_nickname === publicNickname) + 1;
```

- [ ] **Step 4: Add a leaderboard summary panel above the table**

```vue
<LeaderboardSummaryCard
  :rank="currentUserRank"
  :metric="leaderboardStore.metric"
  :is-ranked="currentUserRank > 0"
  :requires-threshold="leaderboardStore.metric === 'accuracy'"
/>
```

- [ ] **Step 5: Pin or visually highlight the current user row**

```vue
<tr :class="{ 'leaderboard-row-current': row.public_nickname === currentUserNickname }">
```

Also add an empty/not-ranked message like:

```vue
<p v-if="!leaderboardStore.isLoading && rows.length === 0">
  Complete a worksheet to start appearing in the leaderboard.
</p>
```

- [ ] **Step 6: Verify coverage**

Run:
- `npm run test --workspace frontend -- src/tests/leaderboard-view.test.ts`
- `npm run test:e2e -- e2e/specs/routes/leaderboard.spec.ts`

Expected: PASS, with clearer signed-in motivation and better empty states.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/leaderboard/LeaderboardSummaryCard.vue frontend/src/views/LeaderboardView.vue frontend/src/components/leaderboard/LeaderboardTable.vue frontend/src/lib/leaderboard.ts frontend/src/styles/main.css frontend/src/tests/leaderboard-view.test.ts e2e/specs/routes/leaderboard.spec.ts
git commit -m "Make leaderboard more motivational"
```

---

### Task 6: Clarify Public vs Private Identity in Profile

**Files:**
- Create: `frontend/src/components/profile/PublicIdentityPreview.vue`
- Modify: `frontend/src/views/ProfileView.vue`
- Modify: `frontend/src/styles/main.css`
- Test: `frontend/src/tests/profile-view.test.ts`

- [ ] **Step 1: Write the failing profile test**

```ts
test("separates public nickname from private account details", () => {
  render(ProfileView, {
    global: profileViewTestSetup({
      user: { publicNickname: "des", email: "desdae@gmail.com" }
    })
  });

  expect(screen.getByText("Public identity")).toBeInTheDocument();
  expect(screen.getByText("Private account")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace frontend -- src/tests/profile-view.test.ts`
Expected: FAIL because the page currently treats the nickname editor as a single card.

- [ ] **Step 3: Add a small public identity preview component**

```vue
<template>
  <aside class="profile-identity-preview">
    <p class="eyebrow">Public identity</p>
    <strong>{{ nickname }}</strong>
    <p class="lede">This is the name shown on leaderboards and other learner-facing screens.</p>
  </aside>
</template>
```

- [ ] **Step 4: Split the profile into public and private sections**

```vue
<section class="card page-stack">
  <h2>Public identity</h2>
  <!-- nickname editor + preview -->
</section>

<section class="card page-stack">
  <h2>Private account</h2>
  <p>{{ authStore.user.email }}</p>
  <p class="lede">Google account details stay private and are not shown publicly in the app.</p>
</section>
```

- [ ] **Step 5: Verify tests**

Run: `npm run test --workspace frontend -- src/tests/profile-view.test.ts`
Expected: PASS, with clearer privacy framing.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/profile/PublicIdentityPreview.vue frontend/src/views/ProfileView.vue frontend/src/styles/main.css frontend/src/tests/profile-view.test.ts
git commit -m "Clarify public and private identity in profile"
```

---

### Task 7: Improve Navigation and Global Orientation

**Files:**
- Modify: `frontend/src/components/layout/AppHeader.vue`
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/styles/main.css`
- Test: `frontend/src/tests/app-header.test.ts`
- Test: `e2e/specs/routes/navigation.spec.ts`

- [ ] **Step 1: Write the failing navigation test**

```ts
test("shows active route styling and a primary generate action", async () => {
  render(AppHeader, {
    global: headerTestSetup("/worksheets")
  });

  expect(screen.getByRole("link", { name: /saved/i })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: /new worksheet/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace frontend -- src/tests/app-header.test.ts`
Expected: FAIL because the header currently uses plain links with no active state and no global CTA.

- [ ] **Step 3: Add active-link and signed-in state to the header**

```vue
<RouterLink to="/worksheets" class="site-nav-link" active-class="site-nav-link-active">Saved</RouterLink>
<RouterLink class="button site-header-cta" to="/generate">New worksheet</RouterLink>
```

- [ ] **Step 4: Add compact mobile behavior**

```css
@media (max-width: 800px) {
  .site-header {
    display: grid;
    grid-template-columns: 1fr auto;
  }

  .site-nav {
    grid-column: 1 / -1;
    overflow-x: auto;
  }
}
```

- [ ] **Step 5: Verify navigation coverage**

Run:
- `npm run test --workspace frontend -- src/tests/app-header.test.ts`
- `npm run test:e2e -- e2e/specs/routes/navigation.spec.ts`

Expected: PASS, with clearer global orientation and easier movement between surfaces.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/layout/AppHeader.vue frontend/src/App.vue frontend/src/styles/main.css frontend/src/tests/app-header.test.ts e2e/specs/routes/navigation.spec.ts
git commit -m "Improve navigation orientation"
```

---

### Task 8: Visual System Cleanup and Final Verification

**Files:**
- Modify: `frontend/src/styles/main.css`
- Modify: `README.md`
- Test: existing frontend and E2E suites

- [ ] **Step 1: Reduce card dependence and tighten type hierarchy**

```css
:root {
  --surface-soft: rgba(255, 253, 248, 0.72);
  --surface-strong: rgba(255, 253, 248, 0.92);
}

.section-divider {
  border-top: 1px solid rgba(30, 31, 41, 0.08);
}
```

Apply this cleanup only where it helps readability; do not re-theme the app into a different product.

- [ ] **Step 2: Update README with UX flow notes**

```md
## UX Flow Highlights

- Google sign-in continues through nickname and local-import onboarding.
- Dashboard centers the next recommended action.
- Saved worksheets can be filtered from visible quick filters.
- Leaderboards highlight the signed-in user's rank when present.
```

- [ ] **Step 3: Run the full frontend verification set**

Run:
- `npm run test --workspace frontend`
- `npm run build --workspace frontend`
- `npm run test:e2e -- --workers=1 e2e/specs/flows/nickname-onboarding.spec.ts e2e/specs/flows/import-local-progress.spec.ts e2e/specs/routes/dashboard.spec.ts e2e/specs/routes/saved-worksheets.spec.ts e2e/specs/routes/leaderboard.spec.ts`

Expected: PASS, with no console errors or route regressions.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/styles/main.css README.md frontend/src/tests e2e/specs
git commit -m "Polish frontend UX flow and styling"
```

---

## Self-Review

**Spec/roadmap coverage**
- Onboarding flow: covered in Task 1
- Dashboard next-action redesign: covered in Task 2
- Worksheet progress/completion clarity: covered in Task 3
- Saved worksheet retrieval/filter discoverability: covered in Task 4
- Leaderboard motivation and current-user context: covered in Task 5
- Profile privacy framing: covered in Task 6
- Navigation/global polish: covered in Task 7
- Styling/readme/final verification: covered in Task 8

**Placeholder scan**
- No `TODO`, `TBD`, or “write tests for above” placeholders remain.
- Each task includes concrete files, test commands, and representative code snippets.

**Type consistency**
- Uses existing app terms consistently: `publicNickname`, `worksheet.status`, `anonymousWorksheets`, `remoteWorksheets`, `problems_solved`, `accuracy_percentage`.
- Keeps current route structure (`/dashboard`, `/generate`, `/worksheets/:id`, `/leaderboard`, `/profile`) intact.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-13-frontend-ux-roadmap-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
