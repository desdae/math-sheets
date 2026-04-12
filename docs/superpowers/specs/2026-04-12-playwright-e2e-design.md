# Playwright E2E Test Suite Design Spec

**Date:** 2026-04-12
**Status:** Draft for review
**Scope:** Broad Playwright end-to-end coverage for the MathSheets application, including console-error detection and core user-flow verification

## 1. Summary

This spec defines a full Playwright end-to-end test system for MathSheets. The goal is to catch real browser/runtime regressions such as Vue console errors, page rendering failures, route breakage, broken API integration, and failures across major user journeys.

The suite will run against the real application stack:

- Vue frontend
- Express backend
- PostgreSQL database

The suite will provide broad route coverage, targeted flow coverage, and strict browser error detection. It will not depend on live Google OAuth. Signed-in scenarios will use a test-only auth path on the backend so tests stay deterministic and CI-safe.

## 2. Goals and Non-Goals

### Goals

- Catch browser console errors and page errors across major routes
- Verify each primary page loads and renders correctly
- Exercise real frontend/backend/database integration
- Cover anonymous worksheet flows
- Cover authenticated dashboard, saved worksheet, profile, and leaderboard flows
- Keep the suite runnable locally with one or two simple commands
- Structure the suite for future CI use

### Non-Goals

- Full third-party Google sign-in automation
- Visual regression screenshot baselines in v1
- Cross-browser matrix in the first version beyond a practical default browser
- Performance benchmarking

## 3. Coverage Strategy

The suite will include two broad categories:

### 3.1 Route smoke coverage

Every major route should be visited directly and checked for:

- successful navigation
- expected core heading/content
- no uncaught page exceptions
- no unexpected `console.error`
- no unexpected failed API requests

Routes in scope:

- `/`
- `/login`
- `/dashboard`
- `/generate`
- `/worksheets`
- `/leaderboard`
- `/profile`
- `/auth/callback`
- representative worksheet detail route

### 3.2 User-flow coverage

The suite should verify key flows, not just page render:

#### Anonymous flows

- open landing page
- navigate to generator
- generate worksheet
- enter answers
- save locally
- reload/reopen saved worksheet
- submit locally and see completion state

#### Authenticated flows

- sign in through test-only E2E auth route
- land on dashboard as authenticated user
- verify stats render
- generate and persist a worksheet as a signed-in user
- save and reopen it
- submit it
- confirm dashboard stats or saved history update
- confirm leaderboard page loads and renders data

#### Import flow

- create one or more local anonymous worksheets
- authenticate through E2E auth route
- verify import confirmation modal appears
- confirm import
- verify local worksheets become account-owned records

## 4. Architecture

## 4.1 Test runner location

Playwright should be installed at the repository root. This keeps E2E commands simple and lets the suite orchestrate frontend and backend startup together.

Recommended additions:

- `playwright.config.ts`
- `e2e/fixtures/`
- `e2e/specs/`
- `e2e/utils/`
- optional `.env.e2e`

## 4.2 App startup model

Playwright should start the frontend and backend automatically using its `webServer` support.

Preferred startup approach:

- backend via `npm run dev --workspace backend`
- frontend via `npm run dev --workspace frontend`
- PostgreSQL provided separately by Docker Compose or ensured by pre-test setup

Alternative:

- run E2E against the existing Docker Compose stack if local services are already running

For the initial implementation, local-process startup plus Dockerized Postgres is the simplest reliable arrangement.

## 4.3 Database handling

E2E runs should use a deterministic database state.

Requirements:

- database reset before the suite or before authenticated specs
- seed baseline users/data where useful
- isolate E2E-created records from normal local development where possible

Recommended first step:

- keep using the existing Docker Postgres instance
- add a reset script that truncates worksheet-related tables and reseeds baseline data

## 5. Signed-In Test Strategy

Live Google OAuth is not suitable for the E2E suite because:

- it introduces a third-party dependency
- it is brittle in CI
- it makes deterministic session setup harder

Instead, the backend should expose a test-only auth route enabled only in E2E mode.

Example approach:

- `POST /api/test-auth/login`
- route is enabled only when `ENABLE_E2E_AUTH=true`
- request may include a known email or display name
- backend creates or loads a user
- backend issues the same access token and refresh cookie used in normal auth

This allows Playwright to authenticate through the real application auth/session model without bypassing frontend or backend state entirely.

## 6. Browser Error Guardrails

One of the main goals is catching runtime and Vue-related console issues.

The base Playwright fixture should:

- listen for `pageerror`
- listen for `console`
- fail the test on unexpected `console.error`
- optionally capture `console.warn` for reporting without failing immediately

The suite should also monitor failed network requests:

- fail on unexpected `4xx/5xx` API responses
- allow explicit exceptions for routes being intentionally tested for failure

This logic should live in a shared fixture rather than being repeated in every spec.

## 7. Test Organization

Recommended structure:

- `e2e/specs/routes/landing.spec.ts`
- `e2e/specs/routes/dashboard.spec.ts`
- `e2e/specs/routes/leaderboard.spec.ts`
- `e2e/specs/routes/profile.spec.ts`
- `e2e/specs/flows/anonymous-worksheet.spec.ts`
- `e2e/specs/flows/import-local-progress.spec.ts`
- `e2e/specs/flows/authenticated-worksheet.spec.ts`
- `e2e/fixtures/base.ts`
- `e2e/fixtures/auth.ts`
- `e2e/utils/db-reset.ts`
- `e2e/utils/test-auth.ts`

This provides clear separation between:

- page smoke checks
- broader end-to-end journeys
- shared setup/utilities

## 8. Assertions Per Route

### Landing page

- primary heading visible
- "Try it now" action visible
- no console/page errors

### Login page

- sign-in CTA visible
- anonymous continue option visible
- no console/page errors

### Dashboard

- anonymous or signed-in dashboard state renders correctly
- import modal behavior is correct when local data exists after login
- no console/page errors

### Generator

- generator form visible
- generate action works
- generated worksheet preview/grid appears
- no console/page errors

### Worksheet page

- generated questions render
- answer entry works
- save action works
- submit action works
- completion state renders
- no console/page errors

### Saved worksheets

- local worksheets render for anonymous mode
- synced worksheets render for signed-in mode
- navigation to worksheet detail works
- no console/page errors

### Leaderboard

- leaderboard rows render
- period and metric switching work
- no console/page errors

### Profile

- signed-in summary renders when authenticated
- anonymous prompt renders when not authenticated
- no console/page errors

## 9. Playwright Configuration

The initial config should include:

- one default project using Chromium
- base URL pointing at frontend local URL
- trace collection on retry/failure
- screenshot on failure
- video retention on failure if acceptable
- multiple `webServer` entries for frontend and backend
- optional retries in CI only

Potential later expansion:

- Firefox project
- WebKit project
- CI-specific reporter config

## 10. Test Data Model

The suite should use a small, well-defined set of fixture users:

- one authenticated E2E user for general signed-in tests
- optional second user if leaderboard ordering needs comparison

Fixture data should be minimal:

- enough worksheets to make leaderboard/profile assertions stable
- no reliance on hand-created external state

## 11. Backend Changes Needed

The backend will need small, explicit E2E hooks:

- test-only auth login route
- optional test-only logout/reset helpers
- E2E flag in environment config

These hooks must be:

- disabled by default
- clearly isolated to test mode
- documented in README

## 12. Frontend Changes Needed

The frontend may need light changes to make E2E testing more reliable:

- stable selectors via `data-testid` on important controls
- clearer loading/empty states
- predictable routing after auth callback

These changes should improve both testability and product clarity, not just serve automation.

## 13. Commands

The repo should gain commands such as:

- `npm run test:e2e`
- `npm run test:e2e:headed`
- `npm run test:e2e:ui`
- `npm run test:e2e:install`

Optional support commands:

- `npm run db:reset:e2e`

## 14. README Updates

README should document:

- Playwright installation
- browser installation command
- how to start Docker Postgres
- how E2E auth works
- how to run the suite locally
- how to run headed mode for debugging

## 15. Risks and Mitigations

### Risk: flaky tests due to async UI timing

Mitigation:

- use Playwright auto-waiting
- assert on visible UI states rather than arbitrary sleeps
- centralize route/auth helpers

### Risk: tests depend on external Google OAuth

Mitigation:

- use test-only backend auth route

### Risk: false positives from noisy console logs

Mitigation:

- fail only on true `console.error` and uncaught exceptions by default
- whitelist known harmless cases only if necessary and documented

### Risk: state leakage between tests

Mitigation:

- reset database between authenticated suites
- clear local storage/session state between tests

## 16. Success Criteria

The E2E suite is successful when:

- all major routes have smoke coverage
- core anonymous and authenticated worksheet flows are covered
- tests fail on real browser console/runtime problems
- the suite is runnable locally with simple commands
- failures produce actionable artifacts like traces/screenshots

## 17. Out of Scope for the Initial E2E Rollout

- real Google login automation
- screenshot snapshot regression system
- cross-browser matrix
- mobile viewport matrix
- visual diff baselines

These can be added later once the core suite is stable.
