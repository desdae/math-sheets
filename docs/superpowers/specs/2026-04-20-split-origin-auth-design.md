# Split-Origin Auth Design

**Goal**

Adapt MathSheets production auth and API routing from a same-origin deployment to a split-origin deployment where:

- the frontend runs at `https://mathsheet.app`
- the API runs at `https://api.mathsheet.app`
- Google OAuth returns to the API origin and then hands control back to the frontend origin

The design should preserve the current auth flow, minimize code churn, and keep local development behavior unchanged.

**Scope**

This design covers:

- production frontend API base URL behavior
- production backend OAuth redirect configuration
- cross-subdomain cookie scoping for auth state and refresh cookies
- targeted automated test updates
- deployment and verification requirements for the new domain layout

It does not cover broader infrastructure work such as DNS provisioning, certificate management, or unrelated frontend/backend refactors.

## Deployment Assumption

The new release target is **split-origin within one parent domain**:

- frontend origin: `https://mathsheet.app`
- API origin: `https://api.mathsheet.app`
- both are served over HTTPS
- browser requests from the frontend to the API use `credentials: "include"`

This is not treated as a completely unrelated-site deployment. The frontend and API remain under the same registrable domain, so cookie sharing can be handled intentionally through the parent domain.

## Architecture

The current auth flow remains structurally the same:

1. the user starts sign-in from the frontend
2. the browser is redirected to the backend Google auth endpoint
3. Google returns to the backend callback endpoint
4. the backend issues the session cookie and redirects the browser back to the frontend auth callback view
5. the frontend restores the session through `/auth/refresh` and then fetches the current user

The main change is that steps 2 through 4 now cross subdomains intentionally.

Required production routing:

- frontend API base URL: `https://api.mathsheet.app/api`
- backend `APP_BASE_URL`: `https://mathsheet.app`
- backend `GOOGLE_CALLBACK_URL`: `https://api.mathsheet.app/api/auth/google/callback`

This keeps the frontend as the user-facing app origin while making the backend the canonical OAuth callback host.

## Frontend Behavior

The frontend should no longer rely on production same-origin defaults for this deployment shape.

Design requirements:

- production must set `VITE_API_BASE_URL=https://api.mathsheet.app/api`
- the shared API base resolver remains the source of truth for frontend requests
- the Google sign-in entrypoint must use the same resolver path as other API traffic
- local development behavior should remain unchanged:
  - dev still falls back to localhost backend values
  - same-origin production fallback behavior may remain in code for future deployments, but this release must explicitly configure the split API base URL

The design intentionally avoids changing frontend auth state storage or routing. The current callback page and refresh flow remain valid once cookies are scoped correctly.

## Backend OAuth Routing

The backend should remain responsible for Google OAuth initiation and callback handling.

Required production behavior:

- `GET /api/auth/google` initiates Google OAuth from `api.mathsheet.app`
- Google redirects back to `https://api.mathsheet.app/api/auth/google/callback`
- after successful callback handling, the backend redirects the browser to `https://mathsheet.app/auth/callback`

This preserves the current separation of concerns:

- the backend owns external OAuth exchange and session issuance
- the frontend owns post-login UX and session restoration

No new frontend-side OAuth token handling is introduced.

## Cookie Policy

Split-origin auth depends on cookies being scoped deliberately rather than host-only.

### Development

Development behavior should remain as it is today:

- `httpOnly: true`
- `sameSite: "lax"`
- `secure: false`
- no custom `domain`

### Production Split-Origin

Production auth cookies should use:

- `httpOnly: true`
- `sameSite: "none"`
- `secure: true`
- `domain: "mathsheet.app"`
- `path: "/api/auth"`

This policy must be applied consistently to:

- the OAuth state cookie
- the refresh token cookie
- refresh-token rotation writes
- logout cookie clearing
- OAuth state cookie clearing

The critical detail is that cookie clearing must use the same `domain` and `path` values as cookie creation. Otherwise stale cookies can survive logout or OAuth cleanup.

## CORS

The backend should continue allowing credentialed requests only from the frontend origin.

Required production policy:

- allowed origin: `https://mathsheet.app`
- credentials enabled

No wildcard origin behavior is acceptable because credentialed cross-origin auth is in use.

## Configuration Changes

### Backend worker configuration

Production backend configuration should move to:

- `APP_BASE_URL=https://mathsheet.app`
- `GOOGLE_CALLBACK_URL=https://api.mathsheet.app/api/auth/google/callback`
- `COOKIE_DOMAIN=mathsheet.app`

### Frontend deployment configuration

Production frontend configuration should set:

- `VITE_API_BASE_URL=https://api.mathsheet.app/api`

The checked-in project documentation and configuration tests should reflect this split-origin deployment model.

## Testing Requirements

The change should be protected by focused regression tests.

### Frontend

Add or update tests to verify:

- explicit `VITE_API_BASE_URL` remains the highest-priority production API target
- Google sign-in URL generation follows the same API base resolution as other frontend API calls

### Backend

Add or update tests to verify:

- production worker config points `APP_BASE_URL` at `https://mathsheet.app`
- production worker config points `GOOGLE_CALLBACK_URL` at `https://api.mathsheet.app/api/auth/google/callback`
- production cookie configuration applies `Domain=mathsheet.app` where appropriate
- cookie clearing uses matching production scoping

### Build verification

Both workspaces must still build successfully after the configuration and cookie changes.

## Documentation

The README and any deployment notes touched by implementation should be updated to reflect:

- the frontend/API split between `mathsheet.app` and `api.mathsheet.app`
- the exact Google OAuth production origin and redirect URI values
- the requirement to set `VITE_API_BASE_URL` for split-origin deployments
- the use of parent-domain cookies for auth in this deployment shape

Documentation should not imply that the current release target is still same-origin.

## Manual Verification

After deployment, the implementation should be manually checked with the real production hosts.

Expected verification flow:

1. open `https://mathsheet.app`
2. start Google sign-in
3. confirm the browser is sent through `https://api.mathsheet.app/api/auth/google`
4. confirm Google returns to `https://api.mathsheet.app/api/auth/google/callback`
5. confirm the backend redirects back to `https://mathsheet.app/auth/callback`
6. confirm the frontend successfully restores the session and reaches onboarding or dashboard
7. confirm logout clears the auth cookie state cleanly

## Out of Scope

This design intentionally does not include:

- changing JWT storage strategy
- replacing refresh cookies with another session mechanism
- merging frontend and API back to one origin
- adding multiple frontend origins to CORS
- redesigning onboarding or post-login UX
- DNS, TLS, or Cloudflare dashboard setup instructions

## Success Criteria

This work is complete when:

- production frontend traffic targets `https://api.mathsheet.app/api`
- Google OAuth callbacks land on `https://api.mathsheet.app/api/auth/google/callback`
- successful auth redirects return users to `https://mathsheet.app/auth/callback`
- production auth cookies are scoped to `mathsheet.app`
- logout and OAuth cleanup clear cookies with matching scope
- targeted frontend/backend tests cover the new split-origin behavior
- frontend and backend builds pass
