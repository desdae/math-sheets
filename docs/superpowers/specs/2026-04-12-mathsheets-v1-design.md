# MathSheets V1 Design Spec

**Date:** 2026-04-12
**Status:** Draft for review
**Scope:** Single-user worksheet product with anonymous local mode, Google sign-in, synced history, stats, and public leaderboards

## 1. Product Summary

MathSheets V1 is a printable arithmetic worksheet web app for students, parents, and teachers acting as individual users. It supports two modes:

- Anonymous mode for immediate worksheet generation and local progress saving in the browser
- Signed-in mode with Google OAuth, PostgreSQL-backed persistence, statistics, and leaderboard eligibility

The product centers on generating valid arithmetic worksheets using only addition, subtraction, multiplication, and division. Users can configure worksheet size, difficulty, operations, and number ranges; solve problems in the browser; save progress; submit worksheets for scoring; print worksheets cleanly; and review personal performance over time.

V1 explicitly excludes classroom, teacher, roster, assignment, and multi-tenant organization features. The design should keep those extensions possible without contaminating the V1 data model with premature abstractions.

## 2. Goals and Non-Goals

### Goals

- Let new users start immediately without account creation
- Provide a clean upgrade path from anonymous local progress to a Google-authenticated account
- Generate valid printable arithmetic worksheets with configurable difficulty and operations
- Persist signed-in worksheet state, answers, correctness, and history in PostgreSQL
- Track personal statistics and public leaderboards efficiently
- Ship with a production-ready folder structure, API shape, and environment-based configuration

### Non-Goals

- Classroom, teacher, or assignment management
- Non-arithmetic topics such as fractions, algebra, geometry, or word problems
- Collaborative solving or worksheet sharing between users
- Native mobile applications
- Full PDF rendering service in V1

## 3. User Types and Permissions

### Anonymous user

- Can access landing page, generator, solving flow, print layout, saved local worksheets, and local progress summary
- Cannot appear on leaderboards
- Cannot store data in PostgreSQL
- Can choose whether to import local worksheets after first sign-in

### Signed-in user

- Can do everything an anonymous user can do
- Has a persisted account in PostgreSQL
- Can save worksheets and attempts to the backend
- Can submit worksheets for scoring and statistics
- Can appear on public leaderboards
- Can view synced history and personal stats across devices

## 4. Core User Flows

### 4.1 Anonymous first-use flow

1. User lands on the marketing page.
2. User clicks a CTA to try the generator without signing in.
3. User configures a worksheet and generates problems.
4. User solves, saves locally, prints, or returns later on the same device.
5. UI explains that sign-in unlocks sync, stats, and leaderboards without blocking anonymous usage.

### 4.2 Sign-in flow

1. User clicks Google sign-in.
2. Frontend starts Google OAuth via the backend.
3. Backend verifies Google identity, creates or updates the user record, and issues auth credentials.
4. Frontend loads authenticated state and synced dashboard data.

### 4.3 Anonymous import confirmation flow

1. Frontend detects local anonymous worksheets after successful sign-in.
2. A one-time confirmation modal asks whether to import local progress into the new account.
3. If confirmed, the client sends a batched import payload to the backend.
4. Backend validates and inserts imported worksheets and attempts as account-owned records.
5. If declined, local anonymous data remains local until explicitly cleared by the user.

### 4.4 Worksheet lifecycle

1. User configures a worksheet.
2. Backend generates the worksheet definition for both anonymous and signed-in users through the same worksheet generation API so the rule set stays consistent; anonymous worksheet storage remains local in the browser.
3. Worksheet is opened in the solving view.
4. User fills in answers and may save as draft or partial progress.
5. User submits the worksheet.
6. Backend evaluates correctness, stores results, updates statistics, and exposes the completed worksheet in history.

## 5. Product Requirements

### 5.1 Authentication

- Authentication provider: Google OAuth 2.0
- Frontend: starts sign-in flow and consumes authenticated session state
- Backend: owns OAuth callback handling, user creation, token issuance, and session refresh
- Session model: short-lived JWT access token paired with secure HTTP-only refresh token cookie
- Access token is used for authenticated API requests
- Refresh token is stored server-side as a hashed record or rotation-safe token reference
- Logout invalidates the refresh token and clears session state

### 5.2 Worksheet generation

Users can configure:

- Number of problems
- Difficulty: easy, medium, hard
- Allowed operations: any subset of `+`, `-`, `*`, `/`
- Number ranges such as `1-10`, `1-100`, `1-1000`
- Worksheet size: small, medium, large
- Optional clean division toggle, default enabled

Generation rules:

- Every question must be mathematically valid
- Division should prefer integer answers by default
- Mixed-operation worksheets are supported
- Difficulty affects operand size and question complexity
- Worksheet size controls layout density and defaults for printable spacing
- Generated question content must be persisted for signed-in worksheets so later scoring is deterministic

### 5.3 Solving and saving

- Users can open generated worksheets and enter answers
- Signed-in users can save worksheet progress to PostgreSQL
- Anonymous users save equivalent state locally in the browser
- Worksheet statuses: `draft`, `partial`, `completed`
- Submission stores answer correctness per question and completion timestamps

### 5.4 Scoring and statistics

After submission, the system tracks:

- Total worksheets completed
- Total solved problems
- Total correct answers
- Accuracy percentage
- Daily activity
- Weekly activity
- Monthly activity
- Optional streak-ready fields if inexpensive to compute

Only signed-in users' submitted worksheets count toward persistent statistics and leaderboards.

### 5.5 Leaderboards

Leaderboards support the following ranking dimensions:

- Completed worksheet count
- Solved problem count
- Accuracy percentage

Supported periods:

- Daily
- Weekly
- Monthly

Requirements:

- Exclude anonymous users
- Exclude non-submitted worksheets
- Use efficient PostgreSQL queries, indexes, and optionally materialized views if needed
- Make leaderboard ranking stable with deterministic tie-breakers

## 6. Functional Pages

### Landing page

- Product overview and benefits
- Sample worksheet preview
- CTA for anonymous usage
- CTA for Google sign-in
- Brief explanation of saved progress, stats, and leaderboards

### Login/auth page

- Google sign-in launch state
- Auth callback/loading handling
- Friendly error state if OAuth fails

### Dashboard

- Welcome panel
- Quick stats summary
- Resume recent worksheet
- Shortcuts to generate, saved worksheets, stats, and leaderboards
- Import confirmation modal if applicable after first sign-in

### Worksheet generator page

- Presets plus advanced controls
- Form validation
- Preview of generated worksheet metadata before opening

### Worksheet solving page

- Problem list or printable grid
- Answer entry fields
- Save draft / save progress actions
- Submit action
- Print-friendly layout
- Completion summary after submission

### Saved worksheets page

- List of drafts, partial worksheets, and completed worksheets
- Filters by status and date
- Ability to reopen a worksheet

### Leaderboard page

- Period switcher: daily, weekly, monthly
- Metric switcher: worksheets, solved problems, accuracy
- Ranked user list

### User stats/profile page

- User profile summary
- Lifetime totals
- Activity breakdown by time period
- Accuracy and completion insights

## 7. Recommended Architecture

### 7.1 Repository structure

Monorepo layout:

- `frontend/` for Vue 3 + Vite SPA
- `backend/` for Express API
- `database/` for SQL schema, migrations, seed data, and query helpers
- `docs/` for specs and setup documentation

This keeps deployment targets separated while preserving a single product repo and shared documentation.

### 7.2 Frontend architecture

- Vue 3 Composition API
- Vue Router for page navigation
- Pinia for auth, worksheet, and leaderboard state
- Reusable composables for API calls, local anonymous persistence, and auth/session handling
- Print CSS and print-focused worksheet component layouts

Frontend responsibilities:

- Rendering the product UI
- Managing anonymous local worksheet drafts
- Handling auth redirects and authenticated state hydration
- Requesting worksheet generation and submission
- Presenting stats and leaderboards
- Orchestrating the anonymous import confirmation flow

### 7.3 Backend architecture

- Node.js + Express
- Route modules for auth, worksheets, history, leaderboards, and user statistics
- Service modules for worksheet generation, scoring, token/session handling, and stats aggregation
- Middleware for authentication, validation, error normalization, and request logging
- PostgreSQL access via a clean query/data-access layer

Backend responsibilities:

- Google OAuth handling
- User record creation and session issuance
- Trusted worksheet generation for persisted/account-owned worksheets
- Scoring and persistence in transactions
- Leaderboard and stats queries
- Importing validated anonymous worksheet data

## 8. Authentication Design

### OAuth flow

1. Frontend requests Google sign-in from the backend.
2. Backend redirects to Google consent.
3. Google returns to backend callback.
4. Backend verifies identity and upserts user data.
5. Backend issues:
   - access token for API use
   - refresh token in a secure HTTP-only cookie
6. Frontend requests `/auth/me` to hydrate the user profile after sign-in.

### Stored user data

- Google subject identifier
- Email
- Display name
- Avatar URL
- Auth provider metadata
- Timestamps

### Security requirements

- Do not trust client-supplied user identity
- Verify Google ID token or authorization code on the backend
- Use secure cookies in production
- Support refresh token rotation or revocation
- Keep OAuth secrets in environment variables

## 9. PostgreSQL Data Model

The schema should be relational and optimized for deterministic worksheet replay and analytics.

### 9.1 `users`

Purpose:

- Stores account identity and profile data for signed-in users

Key columns:

- `id`
- `google_sub`
- `email`
- `display_name`
- `avatar_url`
- `created_at`
- `updated_at`
- `last_login_at`

Constraints:

- Unique `google_sub`
- Unique `email`

### 9.2 `refresh_tokens`

Purpose:

- Tracks active refresh tokens or token families for session rotation or revocation

Key columns:

- `id`
- `user_id`
- `token_hash`
- `expires_at`
- `revoked_at`
- `created_at`

### 9.3 `worksheets`

Purpose:

- Stores worksheet-level metadata and configuration

Key columns:

- `id`
- `user_id`
- `title`
- `status` (`draft`, `partial`, `completed`)
- `difficulty`
- `problem_count`
- `allowed_operations` as a PostgreSQL text array
- `number_range_min`
- `number_range_max`
- `worksheet_size`
- `clean_division_only`
- `source` (`generated`, `imported`)
- `local_import_key`
- `started_at`
- `submitted_at`
- `created_at`
- `updated_at`

### 9.4 `worksheet_questions`

Purpose:

- Stores each generated question exactly as presented

Key columns:

- `id`
- `worksheet_id`
- `question_order`
- `operation`
- `left_operand`
- `right_operand`
- `display_text`
- `correct_answer`

### 9.5 `worksheet_attempts`

Purpose:

- Stores solving or session-level data separate from the worksheet definition

Key columns:

- `id`
- `worksheet_id`
- `user_id`
- `status`
- `elapsed_seconds`
- `started_at`
- `last_saved_at`
- `completed_at`
- `score_correct`
- `score_total`
- `accuracy_percentage`

Assumption:

- V1 uses one primary attempt per worksheet, but the table shape keeps future support for retries possible.

### 9.6 `worksheet_answers`

Purpose:

- Stores the user's current or submitted answer per question

Key columns:

- `id`
- `attempt_id`
- `worksheet_question_id`
- `answer_text`
- `is_correct`
- `answered_at`

### 9.7 `user_statistics`

Purpose:

- Caches aggregate lifetime metrics for quick dashboard access

Key columns:

- `user_id`
- `worksheets_completed`
- `problems_solved`
- `correct_answers`
- `accuracy_percentage`
- `current_streak_days`
- `last_activity_date`
- `updated_at`

### 9.8 Activity rollups and leaderboard views

Purpose:

- Power daily, weekly, and monthly leaderboards without expensive per-request application logic

Options:

- SQL views for dynamic leaderboard reads
- Materialized views if leaderboard load justifies refresh complexity
- A daily activity rollup table if dashboard and streak features need it

## 10. Worksheet Generation Rules

### 10.1 Shared generation principles

- Use only selected operations
- Respect configured number range
- Avoid malformed expressions
- Avoid negative results for easy subtraction unless explicitly allowed in future
- Keep division integer-clean by default
- Shuffle operations for mixed sets

### 10.2 Difficulty mapping

#### Easy

- Smaller operands
- Fewer carry or borrow situations
- Clean, direct operations
- Mostly one-step arithmetic facts

#### Medium

- Larger operands within the chosen range
- More carry or borrow and multiplication variety
- Mixed operations more evenly distributed

#### Hard

- Largest configured operands
- More challenging multiplication and division pairs
- More carry or borrow frequency
- Denser mixed-operation worksheets

### 10.3 Worksheet size mapping

- `small`: fewer problems or larger spacing, suitable for younger students or short drills
- `medium`: balanced spacing and standard problem counts
- `large`: dense printable layout for many problems on a page

Layout and default problem counts may be adjusted by the frontend, but persisted worksheet configuration must store the final generated problem count explicitly.

## 11. API Design

All endpoints return JSON unless redirect-based auth flow requires otherwise.

### Auth routes

- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Worksheet routes

- `POST /api/worksheets/generate`
- `POST /api/worksheets`
- `GET /api/worksheets`
- `GET /api/worksheets/:id`
- `PATCH /api/worksheets/:id/save`
- `POST /api/worksheets/:id/submit`
- `POST /api/worksheets/import-local`

### User routes

- `GET /api/users/me/stats`
- `GET /api/users/me/history`

### Leaderboard routes

- `GET /api/leaderboards?period=daily&metric=worksheets`
- `GET /api/leaderboards?period=weekly&metric=problems`
- `GET /api/leaderboards?period=monthly&metric=accuracy`

### Validation requirements

- Reject invalid enum values
- Reject empty operation selections
- Validate numeric ranges and counts
- Prevent submission of already completed worksheets unless future retry logic is introduced
- Validate import payload shape carefully to prevent client-side tampering

## 12. Import and Merge Rules

Anonymous import is confirmation-based, not automatic.

Rules:

- Only run the import prompt once after initial sign-in while local anonymous data exists
- Import preserves worksheet configuration, generated questions, saved answers, and status
- Imported records are marked with source `imported`
- Imported completed worksheets count toward the signed-in user's history and statistics once stored under the account
- Anonymous activity never appears on leaderboards before account ownership exists
- Duplicate local imports should be prevented via a client-generated local worksheet identifier stored with a uniqueness guard

## 13. Statistics and Leaderboard Semantics

### Statistics

- Count only completed, submitted, account-owned worksheets
- `problems_solved` counts questions on submitted worksheets
- `correct_answers` counts correct submitted answers
- `accuracy_percentage` is computed from total correct answers divided by total solved problems

### Leaderboards

- Daily leaderboard uses UTC calendar day boundaries for all users
- Weekly leaderboard uses UTC week boundaries for all users
- Monthly leaderboard uses UTC month boundaries for all users
- Accuracy leaderboard should require a minimum solved-problem threshold to avoid unfair top ranks from tiny sample sizes
- Ties should break by higher solved-problem count, then most recent activity, then stable user ID ordering

V1 decision:

- Period boundaries are based on UTC in API queries, statistics rollups, and leaderboard presentation labels so ranking behavior is globally consistent.

## 14. UI and Design Direction

The UI should feel clean, modern, and approachable for both children's caregivers and older students. It should avoid looking toy-like or overly academic.

Design principles:

- Fast path to worksheet generation
- Calm, readable typography
- Responsive layout for laptop, desktop, and tablet
- Clear distinction between anonymous local state and signed-in synced state
- Print-friendly worksheet surface with minimal chrome while printing
- Strong empty and loading states

## 15. Error Handling

Frontend should provide:

- Friendly auth failure messaging
- Recoverable form validation feedback
- Clear save and submit success states
- Graceful offline or API-failure messages where possible

Backend should provide:

- Structured error responses
- Validation errors with actionable messages
- Auth errors with correct HTTP status codes
- Safe handling of unexpected server failures without leaking secrets

## 16. Performance and Scalability Notes

- Index foreign keys and leaderboard filter columns
- Keep generation logic inexpensive and deterministic
- Use aggregate tables or views if leaderboard queries become heavy
- Avoid storing derived metrics in multiple places unless refresh and update rules are explicit

V1 can start with direct SQL queries plus a cached `user_statistics` table. Materialized views are optional, not mandatory, unless benchmarks suggest a need.

## 17. Testing Expectations

### Backend

- Unit tests for generation and scoring logic
- Integration tests for auth-protected worksheet lifecycle endpoints
- Query tests for stats and leaderboard semantics

### Frontend

- Component and store tests for generator flow, auth state, and import confirmation logic
- Route-level smoke tests for key pages
- Manual print layout verification

## 18. Deployment and Configuration

Environment variables required:

- Frontend API base URL
- Google client ID
- Backend Google client ID and client secret
- OAuth callback URL
- JWT secret or key material
- Refresh cookie settings
- PostgreSQL connection string
- Application base URL

README must document:

- Local setup
- PostgreSQL creation and migration steps
- Google OAuth configuration steps
- Running frontend and backend in development
- Optional seed data

## 19. Extensibility Notes

The design should leave room for:

- Teacher and classroom features
- PDF export
- Timers
- Streak tracking improvements
- Admin monitoring views
- Additional arithmetic modes or content types

The V1 schema and module boundaries should support extension without requiring a full rewrite.
