# Instagram Public Collector Design

**Goal**

Design a browser-based Vue application with a Node.js backend that accepts any public Instagram username and attempts to retrieve:

- all public posts
- comments for those posts
- current stories
- old story collections / highlights

The product should attempt the full scope, but it must never imply complete retrieval when the source does not allow it. Missing or blocked data should be labeled clearly as `missing`, `partial`, or `inaccessible`.

**Scope**

This design covers:

- a Vue frontend for starting and monitoring collection runs
- a Node.js backend that performs Instagram retrieval work
- a run-oriented collection pipeline for profile, posts, comments, stories, and highlights
- persistence for partial and finished results
- user-facing progress and result states
- export of collected results
- backend and frontend testing strategy

It does not cover:

- Instagram account login flows
- authenticated scraping on behalf of a user
- guaranteed complete historical recovery for expired stories
- mobile apps
- billing, quotas, or multi-user team workflows
- legal review or compliance advice

## Product Assumptions

The agreed requirements are:

- the target can be any public Instagram username
- the product is a regular Vue web app, not a browser extension
- a Node.js backend is acceptable and required for realistic retrieval
- the system should attempt the stricter original scope rather than narrowing the product promise
- unavailable data must be shown honestly instead of hidden

Important source constraints:

- Instagram does not expose an official public API for this use case
- public web surfaces may change without notice
- some data may be blocked by anti-bot controls, rate limits, or rendering changes
- expired stories may not be recoverable unless previously archived or represented as profile highlights
- full comment retrieval may be incomplete for large or heavily paginated posts

The product must therefore be designed as a best-effort collector with explicit evidence of what was and was not retrieved.

## Architecture

The system should use a frontend-backend split.

- [C:\SL\ailab\_web\mathsheets\frontend](C:/SL/ailab/_web/mathsheets/frontend) will host the Vue app for search, progress tracking, and results review
- [C:\SL\ailab\_web\mathsheets\backend](C:/SL/ailab/_web/mathsheets/backend) will host the Node.js API and collection workers
- a persistent data store will keep collection runs, normalized media records, extraction metadata, and failure states

The backend should be organized around collection runs rather than a single synchronous request. A user submits a username, the backend creates a run immediately, and the collector progresses through multiple phases while the frontend polls or subscribes to status updates.

This keeps the app responsive and avoids making the user wait for one large blocking response.

## Core Backend Components

The backend should be split into clear units with narrow responsibilities:

- `run API`
  - create a collection run
  - fetch run status
  - fetch run results
  - export run data
- `profile resolver`
  - normalize the submitted username
  - resolve the target profile
  - capture profile-level metadata and initial availability checks
- `post collector`
  - discover post/reel items exposed for the profile
  - collect captions, timestamps, media URLs, and public engagement metadata when available
- `comment collector`
  - collect comments for each discovered post
  - paginate and retry within configured limits
  - mark posts with partial comment coverage when full traversal is not possible
- `story collector`
  - attempt retrieval of currently visible stories
  - record a clear inaccessible reason when stories are not exposed
- `highlight collector`
  - retrieve profile highlight collections and items when available
- `normalizer`
  - map source-specific fields into internal records
  - attach confidence and retrieval status metadata
- `storage layer`
  - persist incremental progress
  - support resuming or re-reading finished runs

## Collection Run Lifecycle

Each collection request should create a durable `collection run`.

Recommended run phases:

1. `queued`
2. `resolving_profile`
3. `collecting_posts`
4. `collecting_comments`
5. `collecting_stories`
6. `collecting_highlights`
7. `finalizing`
8. `completed`
9. `completed_with_gaps`
10. `failed`

The backend should persist per-phase timestamps, counters, and error summaries so the frontend can show meaningful live progress.

A run should not fail globally just because one phase is incomplete. For example:

- if posts are retrieved but stories are blocked, the run should finish as `completed_with_gaps`
- if comments fail for some posts, those posts should show comment-specific gaps while the rest of the run remains usable
- if the profile itself cannot be resolved, the run can fail early with a profile-level reason

## Data Model

The data model should be built around a run and several child record types.

Recommended entities:

- `collection_runs`
  - run id
  - requested username
  - normalized username
  - overall status
  - progress summary
  - started / completed timestamps
  - top-level warnings and errors
- `profiles`
  - profile identity fields
  - display name, biography, avatar, follower counts when available
  - profile retrieval status
- `media_items`
  - post / reel / story / highlight item type
  - source id and permalink when available
  - media URLs and captions
  - retrieved timestamps
  - retrieval status
- `comments`
  - comment id when exposed
  - author handle, text, timestamp when available
  - relation to parent media item
  - retrieval status
- `highlight_groups`
  - collection title
  - ordering metadata when available
  - retrieval status
- `artifacts`
  - raw payload snapshots, parser outputs, and debug metadata

The system should preserve normalized records for UI use while also optionally keeping raw source artifacts for debugging parser regressions.

## Retrieval Status Model

Every major record type should carry an explicit status field.

Required statuses:

- `retrieved`
- `partial`
- `missing`
- `inaccessible`
- `failed`
- `not_applicable`

Recommended meanings:

- `retrieved`: the item or section was collected with the expected fields
- `partial`: some useful data was collected, but coverage or fields are incomplete
- `missing`: the item likely exists conceptually, but was not exposed in the source material
- `inaccessible`: the source blocked access or did not expose the section for this target
- `failed`: the collector encountered an internal processing error
- `not_applicable`: the profile truly has no data in that category

This model is the foundation for honest product behavior. The UI should display these statuses directly instead of flattening everything into success/failure.

## Frontend Experience

The Vue app should use a simple three-stage flow:

1. `Search`
2. `Run progress`
3. `Results`

### Search Screen

The entry screen should include:

- a username input
- a short explanation that retrieval is best-effort
- examples of what the app attempts to collect
- a warning that some data may be labeled unavailable

This screen should set expectations before the user starts a run.

### Run Progress Screen

After submission, the app should move to a dedicated progress view.

Required elements:

- target username
- current run phase
- phase-by-phase checklist
- counters for posts, comments, stories, and highlights discovered so far
- visible warnings as soon as a category becomes partial or inaccessible

The progress page should update incrementally through polling or server-sent events. Polling is acceptable for v1 and fits the existing app structure more easily.

### Results Screen

The results page should group output into clear sections:

- `Profile`
- `Posts`
- `Comments`
- `Stories`
- `Highlights`
- `Warnings`

Each section should show:

- total discovered items
- number fully retrieved
- number partial
- number missing or inaccessible
- reasons for known gaps

The page should support filtering by retrieval status so users can quickly see only incomplete or blocked data.

## User-Facing Messaging

The product language should be direct and non-misleading.

Good examples:

- `Stories inaccessible for this profile during collection`
- `Comments partially retrieved for 7 posts`
- `Highlights not found on this public profile`

Avoid misleading copy such as:

- `All data imported`
- `Complete archive retrieved`
- `No stories exist` when the real state is only that they were not accessible

## Export Behavior

The app should support export from finished runs.

Recommended exports:

- JSON export of the complete normalized run
- CSV export for posts
- CSV export for comments when comment rows are available

Exports should preserve retrieval status fields so downstream users do not mistake partial exports for complete datasets.

## Error Handling

This product depends on a brittle external source, so failures must be treated as expected behavior.

Requirements:

- a single sub-step failure should not invalidate the full run
- collector errors should be attached to the affected phase or item
- every inaccessible category should include a human-readable reason when possible
- internal parsing errors should be distinguished from source-level blocking
- repeated transient failures should be retried within configured limits
- final run summaries should surface the most important gaps at the top

Recommended error categories:

- `profile_not_found`
- `profile_blocked`
- `rate_limited`
- `parser_changed`
- `comments_incomplete`
- `stories_unavailable`
- `highlights_unavailable`
- `media_removed`
- `internal_processing_error`

## Storage Strategy

Because runs may take time and may produce partial results, persistence is required.

The initial implementation should use a relational database that fits the existing backend conventions. PostgreSQL is the most natural fit in this repo.

Requirements:

- store runs durably from the moment they start
- update progress incrementally
- keep enough source metadata to debug collector regressions
- support rereading prior completed runs
- allow old runs to be pruned later without changing the frontend contract

File/blob storage for large raw artifacts can be deferred if raw payload retention becomes too heavy for the database in later iterations.

## API Shape

Recommended initial endpoints:

- `POST /api/instagram/runs`
  - create a new collection run from a username
- `GET /api/instagram/runs/:id`
  - fetch run status and summary
- `GET /api/instagram/runs/:id/results`
  - fetch normalized results for UI rendering
- `GET /api/instagram/runs/:id/export.json`
  - export normalized JSON
- `GET /api/instagram/runs/:id/export/posts.csv`
  - export post rows
- `GET /api/instagram/runs/:id/export/comments.csv`
  - export comment rows

The create endpoint should return quickly with a run id. Retrieval work should proceed asynchronously after that.

## Scraper Design Constraints

The collector implementation should assume the source may shift often.

Design requirements:

- isolate source parsing from API route logic
- keep parser modules small and target-specific
- preserve raw source snippets for debugging when parsing fails
- avoid tightly coupling the frontend contract to unstable source field names
- treat stories and highlights as separate capabilities rather than variants of one parser

This separation makes future parser repair work much easier when Instagram changes page structure or response shapes.

## Testing Requirements

The implementation should not rely on live Instagram for automated tests.

Required test layers:

- backend unit tests
  - parser behavior
  - normalization behavior
  - status mapping
  - run summary aggregation
- backend integration tests
  - create run
  - phase progression
  - partial failure handling
  - result serialization
- frontend unit/component tests
  - search form behavior
  - progress states
  - results grouping and status badges
  - filtering for incomplete or inaccessible items
- end-to-end tests against mocked backend responses
  - successful mixed-data run
  - comments partially retrieved
  - stories inaccessible
  - highlights missing
  - profile not found

Live-source smoke testing can exist as a manual or opt-in developer workflow, but it should stay out of CI.

## Security And Abuse Considerations

Even though the source is public, the product should still enforce reasonable protections.

Requirements:

- basic rate limiting on run creation
- input validation for usernames
- limits on concurrent active runs
- limits on maximum comment pagination attempts
- logging of internal collector failures without exposing sensitive backend internals to the client

If authentication is added later, it should wrap the run APIs without changing the underlying collector architecture.

## Documentation

Implementation should update repo documentation once work begins.

At minimum:

- explain the new Instagram collector feature in the README
- document required environment variables and runtime dependencies
- document the limits of best-effort collection clearly
- document any operational steps needed for local development and debugging

## Out Of Scope

This design intentionally excludes:

- guaranteed complete historical story recovery
- authenticated account scraping
- scraping through a browser extension
- direct client-side Instagram retrieval from the Vue app
- real-time continuous monitoring of a profile over days or weeks
- multi-tenant account management and billing

Those can be designed later if the product direction changes.

## Success Criteria

This design is successful when:

- a user can submit any public Instagram username from the Vue app
- the backend creates and processes a collection run asynchronously
- the frontend shows live run progress and category-specific warnings
- posts, comments, stories, and highlights are presented in separate sections
- every section uses explicit retrieval statuses
- partial and inaccessible data is labeled honestly
- result exports preserve gap metadata
- automated tests cover successful, partial, blocked, and failed collection scenarios
