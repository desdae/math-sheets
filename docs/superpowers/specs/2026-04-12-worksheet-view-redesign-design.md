# Worksheet View Redesign Design Spec

**Date:** 2026-04-12
**Status:** Draft for review
**Scope:** Redesign the worksheet solving experience to improve focus, automatic progress persistence, answer-state clarity, and submission fairness

## 1. Summary

This spec defines a redesign of the worksheet view in MathSheets. The current worksheet page is functional, but the solving flow is visually flat, progress-saving is too manual, and the primary action hierarchy is weak. The redesigned version will move to a calmer single-column worksheet flow with automatic save feedback, bottom-positioned submission, empty-answer guidance before submit, correctness feedback only after evaluation, and read-only completed worksheets.

This redesign is intentionally focused. It does not change worksheet generation, scoring rules, or leaderboard formulas. It changes how users work through a worksheet and how the UI communicates state.

## 2. Goals and Non-Goals

### Goals

- Make the worksheet page feel like a focused solving surface rather than a generic form
- Save progress automatically as users type
- Surface save status clearly without requiring a dedicated save button for the happy path
- Make unfilled answers visually obvious before submission
- Delay wrong-answer feedback until after submission and evaluation
- Move submit to a bottom review area so submission feels final and deliberate
- Prevent completed worksheets from being edited again
- Preserve existing anonymous and signed-in worksheet flows

### Non-Goals

- Changing worksheet scoring logic
- Adding timers, streaks, or new gamification behavior
- Introducing multi-step submission review dialogs in this version
- Reworking backend leaderboard calculations beyond locking completed worksheets from further edits
- Replacing the worksheet generator or saved worksheets pages

## 3. Chosen Direction

The chosen direction is a single-column review flow inspired by option `B`, with one important product rule:

- before submit, only empty answers are highlighted
- after submit, correct and wrong answers become visually distinct
- once submitted, the worksheet is locked and can no longer be edited

This keeps the experience calm while solving, avoids leaking correctness before evaluation, and closes the obvious abuse case where users could keep editing already-scored worksheets.

## 4. UX Thesis

### Visual thesis

The worksheet should feel like a quiet practice sheet with light progress instrumentation, not like a dashboard. The page should prioritize the questions themselves, with supporting status UI kept compact and readable.

### Content plan

- top: worksheet identity and save status
- middle: solving grid with clear empty-state guidance
- bottom: review summary and submit action
- post-submit: results state and locked worksheet feedback

### Interaction thesis

- auto-save should feel ambient and trustworthy, not noisy
- answer-state styling should escalate only when the user reaches submission
- submit should feel like the end of the workflow, not a competing top-level header action

## 5. Information Architecture

The worksheet page should be reorganized into three vertical zones.

### 5.1 Header zone

The top of the page should include:

- worksheet title
- small worksheet metadata such as difficulty and problem count when useful
- a compact status line such as:
  - `Saving...`
  - `Saved just now`
  - `All progress saved`
  - `Completed and locked`

This area should not include the primary submit action. It may include a secondary back/navigation affordance if already consistent with the app shell.

### 5.2 Solving zone

The worksheet grid remains the main focus of the page. Each answer cell should support distinct display states:

- neutral answered state before submit
- empty pre-submit state
- correct post-submit state
- wrong post-submit state
- disabled locked state for completed worksheets

The worksheet questions should remain easy to scan and printable. The redesign should improve hierarchy and feedback without making the grid visually busy.

### 5.3 Bottom review zone

The bottom of the page becomes the only submit area. It should include:

- a short summary of worksheet readiness
- a count of unanswered questions before submit
- supportive copy that clarifies what happens on submission
- the primary `Submit worksheet` action

After completion, this zone should change from a pre-submit review state to a results/locked state.

## 6. Behavior Rules

## 6.1 Auto-save

Progress should save automatically while the user works.

Requirements:

- typing into an answer updates local worksheet state immediately
- local anonymous worksheets persist back to local storage automatically
- signed-in worksheets persist back to the backend automatically
- auto-save should be debounced so the UI does not fire a network request on every keystroke
- save status should be visible but compact
- auto-save should stop once a worksheet is completed

Recommended save-status states:

- idle with unsaved changes
- saving
- saved
- save failed

The first implementation may keep the visible messaging minimal as long as saving and failure states are distinguishable.

## 6.2 Pre-submit answer highlighting

Before the worksheet is submitted:

- filled answers should remain visually neutral
- empty answers should be visually distinct and easy to find
- wrong answers must not be highlighted yet

Recommended empty-answer treatment:

- dashed or lightly tinted input chrome
- muted warning tone distinct from both success and error
- optional summary count in the bottom review zone

This keeps review focused on completion rather than correctness guessing.

## 6.3 Submission and evaluation

On submit:

- the backend or existing local evaluation logic computes results
- the worksheet status changes to `completed`
- the worksheet receives a submission timestamp
- correctness styling becomes visible
- the page updates to a completed state

Post-submit correctness states:

- correct answers should get a positive but restrained treatment
- wrong answers should get a stronger negative treatment
- empty answers submitted as blank should read as incorrect or unanswered according to existing scoring behavior, but the UI should still make them clearly identifiable

## 6.4 Locked completed worksheets

Completed worksheets must become read-only immediately after submission and remain read-only when reopened later.

Requirements:

- all answer inputs disabled after completion
- `updateAnswer` logic must not mutate a completed worksheet
- auto-save must not continue after completion
- reopening a completed worksheet from saved history must preserve locked state and evaluated styling

This is both a UX rule and a fairness rule. Users should not be able to resubmit or revise already-scored worksheets to game completion and leaderboard behavior.

## 7. Component and State Changes

## 7.1 Worksheet view

`WorksheetView.vue` should become the orchestration layer for:

- loading worksheet data
- deriving save status
- deciding whether the worksheet is editable
- rendering the header, solving grid, and bottom review area

The current top-right button cluster should be removed or reduced so submit is no longer placed in the header.

## 7.2 Worksheet grid

`WorksheetGrid.vue` should be extended to accept explicit display-state inputs rather than inferring everything from raw answers alone.

Suggested derived per-question UI state:

- `empty`
- `filled`
- `correct`
- `wrong`
- `locked`

The component should also support disabled inputs when the worksheet is completed.

## 7.3 Worksheet store

The worksheet store will need new state and behavior for:

- debounced auto-save
- save-status tracking
- completed-state edit prevention

Recommended store additions:

- `saveState` or equivalent derived status
- an auto-save action that can be invoked after answer updates
- a guard in `updateAnswer` that exits if the active worksheet is completed
- a guard in save actions that exits when the worksheet is completed unless an explicit non-mutating refresh is needed

The store should remain the single source of truth for worksheet mutability.

## 8. Visual Design Rules

The redesign should follow these rules:

- keep the page as a single-column workspace on desktop and mobile
- avoid turning the page into stacked dashboard cards
- use one accent color family plus restrained success/warning/error tones
- keep the questions visually dominant over status panels
- use status color only where it communicates meaning
- keep post-submit feedback obvious without becoming harsh or childish

The first screen should communicate:

- what worksheet this is
- whether progress is saved
- what the user is supposed to do next

## 9. Accessibility and Input Behavior

Requirements:

- answer inputs remain keyboard-friendly
- disabled completed inputs must still remain readable
- color should not be the only signal for empty/wrong/correct states
- save status and completion messaging should be text-based, not color-only
- focus styles must stay visible

## 10. Data and API Implications

The redesign can largely use existing worksheet persistence and submission APIs, but behavior must align with the new locking rule.

Required implications:

- completed worksheets returned from backend must preserve completion state on reload
- frontend must respect `status === completed` as non-editable
- save endpoints should not be used for completed worksheets
- submit endpoint should remain the single transition into completed state

If the backend currently accepts save mutations for completed worksheets, that should be tightened as part of implementation or explicitly guarded on the frontend first and then reinforced on the backend.

## 11. Testing Strategy

## 11.1 Frontend unit coverage

Add or update tests for:

- bottom-positioned submit flow rendering
- empty-answer highlighting before submit
- no wrong-answer highlighting before submit
- correct/wrong highlighting after submit
- completed worksheet inputs rendered as disabled
- auto-save status transitions where practical

## 11.2 End-to-end coverage

Update E2E flows to verify:

- generate -> worksheet route still works
- entering an answer triggers progress persistence without manual save in the happy path
- unfilled answers are visually flagged before submit
- completed worksheet shows evaluated result
- reopened completed worksheet cannot be edited
- signed-in and anonymous flows both preserve worksheet locking after completion

## 12. Risks and Mitigations

### Risk: auto-save becomes noisy or flaky

Mitigation:

- debounce save operations
- show compact save status instead of repetitive toast-style messaging
- preserve optimistic local state even if remote save is pending

### Risk: answer states become visually overdesigned

Mitigation:

- keep neutral pre-submit styling
- reserve stronger color treatments for post-submit evaluation
- use color plus border/pattern changes, not color alone

### Risk: completed worksheets still mutate in edge cases

Mitigation:

- guard at both UI and store layers
- add explicit tests for completed worksheet immutability
- reinforce on backend save/update routes if needed

## 13. Success Criteria

The redesign is successful when:

- users no longer need a manual save action for normal progress persistence
- empty questions are easy to spot before submission
- correctness is only revealed after submission
- completed worksheets are clearly locked and cannot be altered
- the submit action feels like the final step of the page rather than a header utility action
- the worksheet page feels calmer and more intentional on both desktop and mobile

