# Production Hardening Design

**Goal**

Prepare MathSheets for a same-origin production deployment by hardening Express-level security behavior without introducing cross-origin complexity or unnecessary infrastructure assumptions.

**Scope**

This design covers the last mandatory application-level hardening work before release:

- Express security headers
- explicit same-origin production cookie behavior
- request body size limits
- minimal deployment/documentation updates

It does not cover operational tasks like backups, uptime monitoring, or legal pages. Those remain in [C:\SL\ailab\_web\mathsheets\docs\pre-launch-checklist.md](C:/SL/ailab/_web/mathsheets/docs/pre-launch-checklist.md).

## Deployment Assumption

The current release target is **same-origin**:

- frontend and backend are served from the same site
- API requests use `/api`
- production traffic is served over HTTPS

This assumption simplifies auth:

- refresh cookies remain `SameSite=Lax`
- no cross-site cookie behavior is needed
- no frontend token storage redesign is required

If deployment later changes to separate origins or subdomains, cookie and CORS behavior will need a separate design pass.

## Architecture

Hardening will stay inside the Express app and current auth routes.

- [C:\SL\ailab\_web\mathsheets\backend\src\app.ts](C:/SL/ailab/_web/mathsheets/backend/src/app.ts) will become the single place for global HTTP hardening behavior
- [C:\SL\ailab\_web\mathsheets\backend\src\routes\auth.routes.ts](C:/SL/ailab/_web/mathsheets/backend/src/routes/auth.routes.ts) will centralize refresh-state and refresh-session cookie options
- the current frontend API strategy remains unchanged: production same-origin uses `/api`, development may still use localhost overrides

The design is intentionally conservative: add strong defaults, keep local development smooth, and avoid introducing CSP complexity that could break current Vite/dev behavior unless specifically required.

## Security Headers

MathSheets should add Express-level security headers using `helmet`.

Required behavior:

- enable `helmet` globally in the Express app
- include the standard protection set provided by `helmet`
- allow same-origin app behavior without adding custom cross-origin exceptions
- keep the configuration production-safe but not over-customized

For this release, the design does **not** require a fully custom Content Security Policy. That would add risk and testing burden late in the release cycle. The priority is to establish strong baseline hardening with defaults that do not disrupt the existing app.

Expected practical protections include:

- safer default browser handling of content types
- framing restrictions
- referrer policy defaults
- general reduction of browser-exposed attack surface

## Cookie Hardening

Refresh-token and OAuth-state cookie behavior should become explicit and centralized.

### Development

- `httpOnly: true`
- `sameSite: "lax"`
- `secure: false`

### Production Same-Origin

- `httpOnly: true`
- `sameSite: "lax"`
- `secure: true`

Additional rules:

- keep cookie `path: "/api/auth"` as-is
- do not set a custom cookie domain for same-origin deployment
- use the same option policy consistently for:
  - OAuth state cookie
  - refresh token cookie
  - refresh-token rotation writes
  - logout cookie clearing

The implementation should avoid repeating near-identical inline cookie option objects. A shared helper or local constant is preferred so production and development behavior cannot drift across auth routes.

## Request Body Limits

The Express app should reject oversized request bodies before they reach route handlers.

Default global limits:

- `express.json({ limit: "100kb" })`
- `express.urlencoded({ extended: true, limit: "100kb" })`

Rationale:

- auth, profile, leaderboard, and worksheet configuration payloads are all small
- smaller defaults reduce abuse potential
- global limits should be tight unless a known route needs more

If a route genuinely needs a larger body later, that route should opt into a larger limit explicitly rather than raising the application-wide default.

For this release, no route is expected to need a larger limit by design.

## Trust Proxy

Because production cookies will use `secure: true`, the app should correctly respect HTTPS when deployed behind a reverse proxy.

Design requirement:

- if production deployment terminates TLS before Node, Express should be configured safely for proxy-aware secure behavior

This should be implemented in the smallest reliable way for the current deployment model. If the production host sits behind a single reverse proxy, `app.set("trust proxy", 1)` is acceptable. If deployment does not require it, the implementation can keep the setting conditional and documented.

## Testing Requirements

The hardening work must be covered by backend tests.

### Security header coverage

Add a backend test that verifies a normal API response includes the expected hardening headers after `helmet` is added.

The test should assert for representative headers rather than every possible header, so it remains stable.

### Cookie behavior coverage

Add auth-route tests that verify:

- refresh cookies are **not** `Secure` in development mode
- refresh cookies **are** `Secure` in production mode
- the same explicit behavior applies to the OAuth state cookie path as well

### Body limit coverage

Add a backend test that sends an oversized JSON payload and expects:

- HTTP `413 Payload Too Large`

The test should exercise a real route that parses JSON so the limit is verified in the actual app stack.

## Documentation

Update documentation to reflect the release assumptions:

- same-origin production is the current supported deployment shape
- HTTPS is required in production
- production cookie behavior depends on that assumption
- frontend production config should prefer `/api` for same-origin deployments

The existing [C:\SL\ailab\_web\mathsheets\README.md](C:/SL/ailab/_web/mathsheets/README.md) and [C:\SL\ailab\_web\mathsheets\docs\pre-launch-checklist.md](C:/SL/ailab/_web/mathsheets/docs/pre-launch-checklist.md) should stay aligned after implementation.

## Out of Scope

This design intentionally does not include:

- custom CSP tuning
- cross-origin frontend/backend deployments
- session redesign
- Web Application Firewall or CDN configuration
- infrastructure backup/monitoring implementation
- privacy policy or terms pages

Those may still be needed before launch, but they are not part of this implementation slice.

## Success Criteria

This work is complete when:

- Express sends baseline hardening headers on API responses
- auth cookies behave explicitly and safely for same-origin production
- oversized bodies are rejected with `413`
- backend tests cover headers, cookie flags, and body limits
- documentation clearly reflects the same-origin production model
