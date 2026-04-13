# Worksheet Timer Design

## Goal

Add a live worksheet timer that starts immediately when a worksheet page loads, continues while the worksheet remains open, and records how long the user spent on each worksheet.

## Product behavior

- The timer starts as soon as the worksheet view loads.
- The timer keeps running while the worksheet page remains open.
- The timer stops once the worksheet is completed.
- Completed worksheets do not restart or continue timing when reopened.
- Signed-in worksheets persist elapsed time to the backend through the existing save/submit flow.
- Anonymous worksheets persist elapsed time locally in browser storage.
- Saved worksheets show recorded time as secondary metadata.

## Timing rules

- Time is measured as wall-clock time while the worksheet route is open.
- The timer does not pause when the tab is hidden.
- The timer does not wait for the first answer; it begins immediately on load.
- The timer is cumulative for a given worksheet record:
  - anonymous worksheets keep their elapsed time in local storage
  - signed-in worksheets resume from the stored backend value when reopened before completion
- Once a worksheet is completed, the recorded elapsed time becomes final for that worksheet.

## UX

### Worksheet view

- The worksheet header adds a quiet timer line near progress and save state.
- While solving, the timer is displayed as `Time: mm:ss` or `hh:mm:ss` for longer sessions.
- After completion, the worksheet displays `Completed in ...`.
- The timer is informational, not styled as a competitive challenge badge.

### Saved worksheets

- Worksheet rows display elapsed time whenever a worksheet has recorded time.
- For completed worksheets, use completion language such as `Completed in 03:42`.
- For draft or partial worksheets, use progress language such as `Worked for 03:42`.
- Time remains secondary metadata, not the primary status badge.

## Data model

### Frontend store

Extend the worksheet record shape with:

- `elapsedSeconds: number`

This value is:

- initialized to `0` for a new worksheet
- incremented while the worksheet is open and active
- saved locally for anonymous worksheets
- sent to backend save calls for signed-in worksheets
- restored from backend when loading a signed-in worksheet

### Backend persistence

Use the existing `worksheet_attempts.elapsed_seconds` column as the source of truth for signed-in worksheets.

No new table is required.

The backend should:

- update `worksheet_attempts.elapsed_seconds` on save
- keep the latest elapsed time on submit
- return elapsed time in worksheet detail responses
- return elapsed time in worksheet list responses so saved/history views can render it

## Architecture

### Frontend

- The worksheet store owns timer state and elapsed-seconds persistence.
- The worksheet view owns interval lifecycle:
  - start interval on load when the worksheet is not completed
  - stop interval on unmount or completion
- The timer increment updates `activeWorksheet.elapsedSeconds`
- Existing autosave behavior continues to persist worksheet progress; elapsed time becomes part of that payload

### Backend

- Keep the current route structure
- Extend worksheet detail/list mapping to include elapsed time
- Continue using save and submit endpoints rather than adding a dedicated timer endpoint

## API changes

### Save request

Continue using:

- `PATCH /api/worksheets/:id/save`

with `elapsedSeconds` populated from the frontend timer instead of always `0`.

### Worksheet detail response

Return:

- worksheet metadata
- questions
- answers
- `elapsedSeconds`

### Worksheet list response

Each worksheet summary should include:

- `elapsedSeconds`

## Error handling

- If a signed-in autosave fails, the existing save-state UI continues to show `Save failed`.
- The timer should still continue locally in memory while the page remains open.
- When autosave succeeds again, the latest elapsed value is persisted.
- For anonymous worksheets, elapsed time persistence follows the same local-save path as answers and status.

## Testing

### Frontend unit tests

- new worksheet starts with `elapsedSeconds = 0`
- timer increments while worksheet is active
- completed worksheets do not keep incrementing
- signed-in save payload includes `elapsedSeconds`
- anonymous worksheet persistence includes `elapsedSeconds`

### Backend tests

- save route/repository persists `elapsed_seconds`
- worksheet detail returns stored elapsed time
- worksheet list returns stored elapsed time
- submit preserves the most recent elapsed time

### E2E tests

- worksheet page displays a visible timer while solving
- elapsed time appears in saved worksheets after leaving/reopening
- completed worksheet shows final time wording

## Scope

This feature is limited to per-worksheet elapsed time tracking and display.

Out of scope:

- speed leaderboards
- per-question timing
- pause/resume controls
- tab-visibility-aware timing
- classroom or teacher timing analytics
