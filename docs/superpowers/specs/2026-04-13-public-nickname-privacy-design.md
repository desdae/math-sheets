# Public Nickname Privacy Design

Date: 2026-04-13

## Goal

Add a privacy-friendly identity model for signed-in users so Google account data remains private and the app uses a user-chosen public nickname everywhere in the product.

The main product need is simple:

- users may sign in with Google for authentication
- users should not be forced to expose their Google display name publicly
- users should choose a public nickname that appears in the app
- users should be able to change that nickname later

This design keeps Google OAuth as the private account identity layer while introducing a separate public profile name used throughout the app.

## Product Direction

The app should distinguish between:

- private account identity, used only for authentication and account management
- public app identity, used anywhere the product shows a user to themselves or to others

Google remains the private identity provider. The frontend should not receive Google display name, Google avatar URL, or Google subject identifier through normal app APIs.

The public-facing identity becomes `publicNickname`.

All app surfaces that currently use `displayName` should instead use `publicNickname`, including:

- profile page heading
- saved user-facing account labels
- leaderboard rows
- any future shared or classroom-facing surfaces

## Chosen Approach

The chosen approach is:

1. keep Google OAuth as the private login mechanism
2. add a separate `public_nickname` field to the `users` table
3. require nickname setup only when a signed-in user does not yet have a nickname
4. allow nickname editing later from the profile page
5. stop exposing Google profile metadata to the frontend user payload

This gives the user a clear privacy boundary without turning the app into a more complex multi-profile system.

## Non-Goals

This change does not include:

- replacing Google OAuth
- adding custom password login
- adding public avatars
- adding teacher, classroom, or sharing identity rules
- adding multi-field public profiles beyond nickname
- building a complete settings center

## User Experience

## 1. First Sign-In

On the first Google sign-in for a user without a public nickname:

1. Google authenticates the user
2. backend creates or finds the private account
3. backend issues normal auth tokens
4. frontend fetches the signed-in user record
5. if `publicNickname` is missing, frontend routes to a nickname setup page instead of entering the normal dashboard flow

The nickname setup screen should:

- explain that Google details stay private
- explain that the nickname is the public name used inside the app
- collect one nickname field
- validate availability and format
- save the nickname
- continue into the normal post-login flow after success

The nickname setup page should be short and reassuring, not framed like a heavy account form.

## 2. Returning Sign-In

For users who already have a nickname:

- Google sign-in continues to work normally
- the callback flow skips nickname setup
- the user proceeds to existing post-login behavior such as remote worksheet fetch and local import prompt

## 3. Profile Editing

The profile page should allow a signed-in user to:

- view their current public nickname
- edit it
- save changes
- see validation errors clearly

The page may still show private email for account reference, but it should not show Google display name or avatar.

## Data Model

The `users` table should support both private and public identity data.

### Existing private fields

- `google_sub`
- `email`
- `display_name`
- `avatar_url`

These remain backend-side account fields.

### New public field

- `public_nickname`

Recommended database shape:

- add nullable `public_nickname` first
- enforce uniqueness case-insensitively
- backfill existing rows from current `display_name`

Because the product is not in production yet, existing users should be backfilled from `display_name` rather than forced through the nickname setup flow on next sign-in.

## Privacy Contract

The frontend should receive only the data it needs for product behavior.

### Frontend-visible user fields

Recommended shape for authenticated user responses:

- `id`
- `email`
- `publicNickname`

Optional:

- `needsNickname` only if the backend wants to make onboarding state explicit

### Frontend-hidden private fields

The following should not be returned through normal frontend APIs:

- Google display name
- Google avatar URL
- Google subject id

The backend may continue to store these values privately if useful for account support or future internal administration.

## Nickname Rules

Nickname validation should be straightforward and predictable.

### Format

- length: 3 to 24 characters
- trim leading and trailing whitespace
- allow letters and numbers
- allow spaces, `_`, and `-`

### Uniqueness

- uniqueness should be case-insensitive
- `Alex`, `alex`, and `ALEX` should count as the same nickname

### Reserved values

Block obvious system-like names such as:

- `admin`
- `support`
- `mathsheets`

The reserved list can stay small in the first version.

## Backend Changes

## 1. User repository behavior

Google sign-in should no longer treat Google `display_name` as the app's public-facing identity.

Repository behavior should become:

- on first Google sign-in, create the user with private Google fields
- preserve or update private account fields on later sign-ins
- do not overwrite `public_nickname` from Google profile data

For existing users without a nickname during migration:

- backfill `public_nickname` once from current `display_name`

## 2. Auth API

`GET /auth/me` should return the privacy-safe user shape.

Recommended response:

- `id`
- `email`
- `publicNickname`

If helpful for onboarding:

- `needsNickname`

`/auth/google/callback` does not need a special response format change if the frontend already calls `/auth/me` after receiving the access token.

## 3. User profile API

Add an authenticated endpoint to update nickname, for example:

- `PATCH /users/me/profile`

The first version only needs nickname editing, so the request body can stay minimal:

- `publicNickname`

Validation errors should return clear field-appropriate messages such as:

- nickname too short
- nickname already taken
- nickname contains invalid characters

## Frontend Changes

## 1. Auth callback flow

The current callback page signs the user in, fetches user state, then routes to dashboard.

This flow should change to:

1. set access token
2. fetch `/auth/me`
3. if user lacks a nickname, route to nickname setup page
4. otherwise continue existing worksheet and dashboard flow

The import-local worksheet prompt should happen after nickname onboarding is complete, not before.

## 2. New nickname setup page

Add a dedicated view such as `/welcome` or `/complete-profile`.

The page should include:

- short privacy explanation
- nickname field
- save/continue action
- inline validation state

The page should be accessible both:

- immediately after first sign-in when nickname is missing
- from guarded redirects if a signed-in user somehow reaches the app without a nickname

## 3. Auth store

The auth store should:

- store `publicNickname` instead of Google `displayName`
- expose whether the signed-in user still needs nickname setup
- update the current user in-place after nickname save

The frontend user model should stop depending on avatar URL and Google display name.

## 4. Profile page

The profile page should be updated to:

- display the public nickname as the main identity label
- optionally show email as private account info
- provide a nickname editing form for signed-in users

The profile page should not display Google avatar or Google name.

## Leaderboards And Public Surfaces

Leaderboard queries and responses should use `public_nickname`.

This means:

- leaderboard rows show nickname only
- no Google profile fields are returned to the leaderboard UI

The same rule should apply to any current or future public-facing user labels.

## Migration

Because the app is still early and not in production, migration can be simple.

### Database migration behavior

1. add `public_nickname`
2. backfill `public_nickname` from existing `display_name`
3. add uniqueness protection for nickname

This keeps existing accounts functional immediately while switching the app over to the new public/private identity split.

## Error Handling

The nickname flow should fail clearly and safely.

### Backend

Return structured validation errors for:

- invalid nickname format
- duplicate nickname
- missing authentication

### Frontend

Show inline errors for:

- unavailable nickname
- invalid characters
- save failure or retry guidance

The onboarding page should not silently fail or route forward without a valid nickname.

## Testing Requirements

### Backend tests

Add or update tests for:

- creating a Google-authenticated user without leaking Google display fields through `/auth/me`
- updating nickname successfully
- rejecting duplicate nickname case-insensitively
- preserving `public_nickname` across later Google sign-ins

### Frontend tests

Add or update tests for:

- auth callback routes nickname-less users to nickname setup
- returning users skip nickname setup
- profile page can edit nickname
- frontend user model uses `publicNickname`

### End-to-end tests

Add E2E coverage for:

- first sign-in -> nickname setup -> dashboard
- nickname edit on profile page
- leaderboard displays nickname rather than Google display name

## Success Criteria

This work is successful when:

- signing in with Google no longer exposes Google display identity to the frontend
- first-time users without a nickname are guided through nickname setup
- returning users keep a stable public nickname
- users can update that nickname later from Profile
- leaderboard and other user-facing surfaces show only public nickname

## Recommended Implementation Shape

Implement this in the following order:

1. database and repository support for `public_nickname`
2. privacy-safe auth/user API responses
3. nickname update endpoint
4. frontend auth model and nickname setup route
5. profile nickname editor
6. leaderboard/user-facing rendering updates
7. unit and E2E coverage
