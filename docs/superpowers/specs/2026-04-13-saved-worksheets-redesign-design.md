# Saved Worksheets Redesign

Date: 2026-04-13

## Goal

Redesign the saved worksheets page so it feels more modern, more useful, and easier to scan at a glance. The page should help users quickly reopen the right worksheet, understand its current state, and filter history by meaningful worksheet metadata instead of browsing a flat list of plain links.

The redesign should keep synced and local worksheets separate. Synced history is the main library. Local worksheets matter only as a temporary device-specific holding area, with an option to import newly created local worksheets after the user signs in.

## Product Direction

The page becomes a worksheet library with an editorial timeline feel rather than a simple list of cards.

The primary section is `Synced worksheets`, grouped into:

- `Today`
- `This week`
- `Earlier`

Each group is visible by default and sorted newest first.

The secondary section is `Local on this device`. It is shown only when local worksheets exist. It uses the same row language as synced history, but is visually quieter and not merged into the synced timeline.

## Information Architecture

### 1. Synced Worksheets

The synced section is the main destination for signed-in users and should appear first on the page.

It includes:

- page heading and short utility copy
- filter bar with active filter chips and a `Clear all` action
- grouped worksheet rows under `Today`, `This week`, and `Earlier`
- empty state when there are no synced worksheets

The page should not collapse date groups behind extra clicks. All groups are expanded by default.

### 2. Local On This Device

The local section appears only when anonymous worksheets exist in browser storage.

It includes:

- section heading
- short explanation that these worksheets are saved only on this device
- list of local worksheet rows
- `Import new local worksheets` action when the user is signed in

When there are no local worksheets, the entire local section is hidden.

## Worksheet Row Design

Each worksheet row should behave like a rich history tile, not a plain text link.

Every row should include:

- worksheet title
- relative or human-readable saved date/time
- status chip such as `completed`, `partial`, or `draft`
- score badge when completed and score is available
- metadata chips for worksheet properties
- small supporting details such as problem count

Recommended metadata chips:

- difficulty: `easy`, `medium`, `hard`
- operations: `addition`, `subtraction`, `multiplication`, `division`
- range: for example `1-10`, `1-100`
- worksheet size: `small`, `medium`, `large`

If a worksheet has multiple operations, each operation should be rendered as its own filterable chip rather than combined into one long label.

## Filter Model

Filters are chip-based and multi-select.

Clicking a metadata chip such as `completed`, `medium`, or `addition` toggles that filter on or off. Filters stack together so users can refine history with combinations such as:

- `completed` + `medium`
- `addition` + `this week`
- `partial` + `hard`

Active filters are shown in a dedicated filter bar above the synced groups. The bar should include:

- all active filters as removable chips
- a single `Clear all` action

Filtering rules:

- filters apply live across all synced rows
- clicking an active chip removes it from the filter state
- clicking a chip inside a row must not navigate away
- empty filtered results show a friendly filtered-empty state with a reset action

The initial implementation should support filtering on:

- status
- difficulty
- operation
- worksheet size

Date grouping itself is structural and should not be implemented as a chip filter in the first pass.

## Interaction Rules

### Navigation

- clicking the worksheet row opens the worksheet
- clicking a metadata chip toggles a filter and does not open the worksheet
- clicking `Import new local worksheets` triggers the existing import flow

### Import Behavior

Local and synced worksheets stay in separate sections.

Import behavior:

- signed-in user + local worksheets present: show `Import new local worksheets`
- signed-in user + no local worksheets: no local section, no import affordance
- signed-out user + local worksheets present: show local section only, without import CTA

The import CTA should stay inside the local section header area so it remains clearly scoped to device-only worksheets.

## Visual Direction

The page should feel warm, modern, and library-like rather than dashboard-like.

Visual principles:

- editorial heading with strong typography
- generous spacing between date groups
- soft panel rows instead of dense tables
- compact chips that feel clickable and filterable
- restrained use of accent color for active filters, status, and score emphasis

Hierarchy rules:

- synced library is visually dominant
- local section is secondary and quieter
- completed scores are prominent but not louder than worksheet titles
- metadata chips stay compact and scannable

The design should avoid:

- plain stacked cards with no grouping
- table-heavy admin styling
- oversized empty states consuming the page
- duplicated section chrome when there is no local content

## Responsive Behavior

Desktop:

- synced library uses grouped vertical sections with full-width rows
- local section appears below synced or in a lighter secondary block, depending on spacing needs

Mobile:

- rows stack naturally
- title, score, and status stay near the top
- chip metadata wraps below the title block
- date/time and problem count move to a lower supporting line
- filter bar remains near the top and wraps cleanly

The mobile layout should preserve easy tap targets for chips without making the page feel crowded.

## Data And View Model Requirements

No backend changes are required for the first version if the current worksheet payload already includes:

- id
- title
- status
- createdAt
- submittedAt
- problem count
- difficulty
- allowed operations
- number range
- worksheet size

For completed rows, the UI should show score only when score data is available locally. If a remote summary does not yet include score information, the row should still render cleanly without the score badge.

The frontend should introduce lightweight helpers for:

- grouping worksheets by date bucket
- normalizing worksheet metadata into display chips
- extracting filterable facets from a worksheet
- applying active multi-select filters

These helpers should live close to the saved worksheets view so the rest of the app does not absorb unnecessary coupling.

## Empty States

### No Synced Worksheets

Show a concise empty state explaining that signed-in worksheet history will appear here once the user saves or completes worksheets.

### No Results After Filtering

Show a filtered-empty state with copy such as:

- no worksheets match the current filters
- clear filters to see more history

Include a `Clear all` action.

### No Local Worksheets

Do not render a local empty block. The local section should simply be absent.

## Testing Requirements

The redesign should be covered by frontend tests for:

- synced rows grouped into `Today`, `This week`, and `Earlier`
- local section shown only when local worksheets exist
- import CTA shown only for signed-in users with local worksheets
- clicking a chip toggles filters without navigating
- multi-select filters stack correctly
- `Clear all` resets the filtered state
- filtered empty state appears when no rows match

Playwright coverage should confirm:

- modern saved worksheet rows render with metadata
- date group headings appear
- filtering updates visible rows
- row click still opens the worksheet
- chip click does not navigate away

## Out Of Scope

The first redesign does not include:

- server-side filtering
- persistent saved filters across sessions
- archive or delete actions
- pagination or infinite scroll
- merging local rows into the synced grouped timeline
- teacher, classroom, or shared worksheet history

## Recommended Implementation Shape

Implement the redesign as a view-layer upgrade of the existing saved worksheets route:

1. add grouped synced timeline rendering
2. add rich worksheet row component or localized row markup
3. add multi-select chip filters
4. add local import section styling and rules
5. extend unit and Playwright coverage

This keeps the scope focused while delivering a materially better saved-history experience.
