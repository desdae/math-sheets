# Legal Pages and Cookie Consent Design

**Goal**

Add production-ready draft legal pages and a global consent flow so MathSheets can explain its data practices clearly, give users control over non-essential cookies, and support future analytics/advertising without rewriting the app structure later.

**Scope**

This design covers:

- a public `Privacy Policy` page
- a public `Terms of Service` page
- an app-level cookie consent banner
- a consent preferences panel
- frontend-only consent storage with versioning
- app navigation/footer updates so legal pages and consent controls stay reachable

It does not cover:

- backend consent audit logging
- real analytics or ad-script integration
- region-specific consent branching
- custom legal review by counsel

## Product Assumptions

MathSheets currently uses:

- necessary auth/session cookies
- local browser storage for worksheet progress and preferences
- Google sign-in for account access

The release target is a **global audience**. The consent model should therefore be conservative and understandable without trying to implement country-by-country logic in v1.

The agreed behavior is:

- strictly necessary cookies are always allowed
- anonymous measurement is allowed by default
- analytics is optional and off until opt-in
- advertising and personalization is optional and off until opt-in
- users are re-prompted only when the consent version changes

## Architecture

The feature should stay entirely in the frontend for v1.

- [C:\SL\ailab\_web\mathsheets\frontend\src\router\index.ts](C:/SL/ailab/_web/mathsheets/frontend/src/router/index.ts) will add public routes for the legal pages
- [C:\SL\ailab\_web\mathsheets\frontend\src\App.vue](C:/SL/ailab/_web/mathsheets/frontend/src/App.vue) or [C:\SL\ailab\_web\mathsheets\frontend\src\components\layout\AppShell.vue](C:/SL/ailab/_web/mathsheets/frontend/src/components/layout/AppShell.vue) will host the global consent UI
- a small dedicated consent utility or store will own:
  - the current consent version
  - persisted category choices
  - timestamp of the recorded choice
  - helpers for deciding whether the banner must appear
- shared layout components will expose legal links and a way to reopen consent preferences later

No backend API is required in this slice. Consent decisions are stored locally and interpreted locally.

## Public Routes

Add two public routes:

- `/privacy`
- `/terms`

These pages must be reachable without authentication and must remain accessible from anywhere in the app.

The router should continue to treat them as normal public app routes rather than special external documents. That keeps them visually consistent with the site and easier to revise over time.

## Privacy Policy Page

The `Privacy Policy` should be a real, structured draft page, not placeholder lorem ipsum.

Required sections:

- what MathSheets is
- what account data is collected
- what worksheet and progress data is stored
- how Google sign-in is used
- how public nicknames work on leaderboards
- what browser storage and cookies are used
- how anonymous measurement works
- how optional analytics depends on consent
- how optional advertising/personalization may depend on consent in the future
- how users can manage or withdraw consent
- how the policy may be updated
- contact placeholder details that are easy to edit later

Cookie and storage details should live inside this page rather than in a separate cookie-policy route.

The page should explicitly distinguish categories:

- **Necessary**: required for login, security, and core app functionality
- **Anonymous measurement**: allowed by default, limited to non-identifying product measurement
- **Analytics**: optional, off until consent
- **Advertising / personalization**: optional, off until consent

The page should also explain that some browser storage is used for local worksheets and consent preferences, even when a user has not signed in.

## Terms of Service Page

The `Terms of Service` should also be a usable draft page.

Required sections:

- acceptance of the terms
- description of the service
- account and nickname responsibilities
- acceptable use
- content and worksheet usage expectations
- no promise of uninterrupted availability
- intellectual property / ownership boundaries
- limitation of liability
- changes to the service or terms
- contact placeholder details

This should read as a practical starter terms page for a small educational web app, not a giant enterprise policy.

## Consent Model

Consent should be recorded by category with a version number.

Recommended stored shape:

- `version`
- `timestamp`
- `necessary: true`
- `anonymousMeasurement: true`
- `analytics: boolean`
- `advertising: boolean`

Behavior rules:

- `necessary` is always enabled and not user-toggleable
- `anonymousMeasurement` is enabled by default and not user-toggleable in v1
- `analytics` starts disabled until the user opts in
- `advertising` starts disabled until the user opts in
- if no consent record exists for the current version, show the banner
- if a record exists for the current version, do not show the banner again automatically
- if the app's consent version changes, show the banner again and ask for a fresh choice

This model avoids pretending that necessary cookies are optional while still giving real control over non-essential tracking.

## Consent Banner

The banner should appear on first visit for the active consent version.

Required actions:

- `Accept all`
- `Reject non-essential`
- `Manage preferences`

Banner content should:

- explain that MathSheets uses cookies/storage for core app features
- explain that analytics and advertising-related features depend on user choice
- link to `/privacy`

`Reject non-essential` should produce:

- `necessary: true`
- `anonymousMeasurement: true`
- `analytics: false`
- `advertising: false`

`Accept all` should enable all categories.

`Manage preferences` should open the preferences panel without dismissing the choice flow prematurely.

## Preferences Panel

Users should be able to reopen and edit consent later.

The preferences UI can be a modal or slide-over, but it must support:

- viewing the consent categories
- toggling `analytics`
- toggling `advertising`
- understanding that `necessary` and `anonymousMeasurement` are always on in this version
- saving updated preferences
- navigating to the `Privacy Policy`

The app should expose a persistent entry point after the first choice, most naturally through a footer or a `Privacy & cookies` link in shared layout.

## Shared Layout Changes

The current shared shell in [C:\SL\ailab\_web\mathsheets\frontend\src\components\layout\AppShell.vue](C:/SL/ailab/_web/mathsheets/frontend/src/components/layout/AppShell.vue) only includes the header and page body. This feature should add a lightweight footer or equivalent bottom-area utility row.

Required footer links:

- `Privacy Policy`
- `Terms of Service`
- `Privacy & cookies` or `Cookie preferences`

The goal is:

- legal pages are always discoverable
- consent can be reopened without hunting through the app
- the banner does not become the only way users can manage their settings

This should remain visually restrained and not compete with the app's main worksheet workflow.

## Storage Strategy

Consent can stay frontend-only in v1.

Recommended storage:

- local storage, because the app already uses browser persistence for anonymous worksheet behavior and this avoids introducing a backend dependency

Requirements:

- use a dedicated key separate from worksheet storage
- include the consent version in the stored record
- safely handle malformed or legacy stored values
- expose small helper functions so future analytics/ad integrations can query permission state consistently

## Data Flow

The runtime flow should be:

1. app loads
2. consent utility reads stored consent
3. if no record exists for the current version, show banner
4. user chooses `Accept all`, `Reject non-essential`, or `Manage preferences`
5. chosen consent is stored locally with version and timestamp
6. banner disappears
7. future integrations can read allowed categories before initializing optional tools

The legal pages themselves should not depend on auth or consent state.

## UX Requirements

The legal and consent experience should feel calm and trustworthy, not alarming.

Requirements:

- concise banner copy
- clear category naming
- no dark-pattern defaults for analytics or advertising
- policy pages should be readable on desktop and mobile
- consent UI should match the existing warm, editorial product style

Because MathSheets may later add ads, the language should already make room for optional advertising/personalization without claiming that such tooling is active today if it is not.

## Testing Requirements

The implementation should be covered by frontend tests.

Required coverage:

- legal routes render successfully
- banner appears when no consent exists for the current version
- `Reject non-essential` stores the expected category choices
- `Accept all` stores the expected category choices
- changing the stored version re-shows the banner
- the preferences UI can reopen and update optional settings
- footer links to privacy, terms, and consent management are present

If Playwright coverage is added, it should at minimum verify first-visit banner behavior and that the user can navigate to the legal pages.

## Documentation

Documentation should be updated so release prep stays coherent.

At minimum:

- mention the new legal pages in the README if there is already a public pages/features section
- keep [C:\SL\ailab\_web\mathsheets\docs\pre-launch-checklist.md](C:/SL/ailab/_web/mathsheets/docs/pre-launch-checklist.md) aligned with the fact that legal pages and client-side consent now exist, while still leaving room for future legal review

## Out of Scope

This design intentionally does not include:

- geolocation-based consent rules
- backend consent audit trails
- real analytics SDK wiring
- ad network integration
- server-side consent enforcement
- custom legal advice

Those can be added later once hosting, analytics tooling, and ad tooling are chosen.

## Success Criteria

This work is complete when:

- MathSheets has public `Privacy Policy` and `Terms of Service` routes
- cookie/storage details are documented inside the privacy page
- first-time visitors see a consent banner for the active version
- users can reject non-essential categories while keeping necessary functionality
- users can reopen and change consent later
- consent choices are versioned and stored locally
- the app has always-available legal and consent links
- frontend tests cover the consent flow and legal routes
