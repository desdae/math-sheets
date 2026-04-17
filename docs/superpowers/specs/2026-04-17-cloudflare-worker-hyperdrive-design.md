# Cloudflare Worker + Hyperdrive Deployment Design

**Goal**

Prepare MathSheets for a Cloudflare deployment model where the frontend and API are deployed as logically separate services, the backend runs on Cloudflare Workers, and PostgreSQL remains the system of record behind Hyperdrive.

**Scope**

This design covers:

- preparing the backend for Cloudflare Workers without rewriting route logic
- keeping the frontend as an independently deployable static Vite application
- adapting configuration so local Node development and Cloudflare production both work
- routing PostgreSQL access through Hyperdrive in production
- documenting the operational implications of split frontend and API origins
- adding targeted tests for the new runtime/config behavior

It does not cover:

- migrating PostgreSQL to D1
- rewriting the API away from Express
- adding distributed rate limiting
- changing product behavior or API contracts
- replacing the current auth model with a Cloudflare-specific identity flow

## Current State

The frontend is a standard Vite + Vue application that already supports a configurable API base URL through `VITE_API_BASE_URL`.

The backend is a Node-oriented Express app with a separate server bootstrap:

- `backend/src/app.ts` creates the Express application and mounts middleware and routes
- `backend/src/server.ts` calls `listen()`
- `backend/src/config/env.ts` reads runtime values from `.env` through `dotenv`
- `backend/src/db/pool.ts` constructs a `pg.Pool` from `DATABASE_URL`

This is a strong starting point because the API composition is already separate from the server bootstrap, but the production runtime assumptions are still Node-centric.

## Deployment Targets

The repo will be prepared for two independent Cloudflare deploy targets:

### Frontend

- Deploy target: Cloudflare Pages or Cloudflare static hosting
- Build artifact: `frontend/dist`
- Runtime model: static SPA
- Production API URL: configured explicitly with `VITE_API_BASE_URL`

### Backend

- Deploy target: Cloudflare Worker
- Entry point: a new Worker bootstrap in `backend/src/worker.ts`
- Runtime model: Express app adapted through Cloudflare's Node compatibility support
- Database connectivity: PostgreSQL through Hyperdrive

The frontend and backend should be independently deployable, versionable, and scalable. They may share a parent domain, but they are not treated as one deploy artifact.

## Architecture

The backend will keep `createApp()` in `backend/src/app.ts` as the canonical place where middleware, routes, and error handling are composed.

Two runtime entrypoints will exist:

- `backend/src/server.ts` for local Node development and existing local workflows
- `backend/src/worker.ts` for Cloudflare Worker deployment

This keeps the route and middleware graph stable while changing only the platform entry layer.

The frontend will remain a normal Vite SPA. It will not be folded into the Worker or proxied through the backend as part of this prep. The only required frontend production behavior is explicit configuration of the API origin through `VITE_API_BASE_URL`.

## Backend Runtime Design

### Worker entrypoint

A new Worker entrypoint will adapt the existing Express app to Cloudflare Workers using Cloudflare's Node compatibility layer. The Worker should expose the same `/api/...` surface that the Node server exposes locally.

The Worker entrypoint should:

- initialize Cloudflare-specific runtime configuration
- create or bind the Express app
- hand request handling to the Node compatibility bridge

The Worker entrypoint must not become a second copy of route logic. It is only an adapter layer.

### Node development entrypoint

`backend/src/server.ts` should remain the local development entrypoint. Local `npm run dev --workspace backend` must continue to work without Wrangler.

This preserves the existing local developer workflow and keeps backend tests running in a normal Node process.

## Configuration Design

### Goals

Configuration needs to work cleanly in three environments:

- local development
- automated Node-based tests
- Cloudflare Worker production

### Approach

The existing `env.ts` module should be refactored so configuration is loaded from an explicit source rather than assuming `.env` at runtime.

The design should introduce:

- a shared schema describing required configuration
- a Node loader for local/test execution that reads `process.env` and optionally `.env`
- a Worker loader that reads Cloudflare vars, secrets, and bindings from the Worker runtime

The application code should consume one normalized config shape regardless of where values came from.

### Production values

Production configuration should move to Cloudflare-managed values where appropriate:

- plain vars for non-secret values such as `APP_BASE_URL`, `GOOGLE_CALLBACK_URL`, and `COOKIE_DOMAIN`
- secrets for values such as `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_SECRET`
- Hyperdrive-backed database connection input for PostgreSQL access

`dotenv` should remain a local-development concern, not a Worker production dependency.

## Database and Hyperdrive Design

PostgreSQL remains the source of truth. This prep is intentionally not a database migration project.

In local development and tests:

- `backend/src/db/pool.ts` should continue to use `DATABASE_URL`

In Cloudflare production:

- database connectivity should resolve through Hyperdrive
- the backend should use the production connection information exposed through Worker configuration

The repository and service layers should not need a broad rewrite. The database adaptation should be confined to configuration/bootstrap boundaries as much as possible.

This keeps the current SQL-heavy backend viable while making production network access Cloudflare-friendly.

## Frontend Design

The frontend should stay structurally unchanged.

The production requirement is simply that the deployed frontend knows the API origin. The existing `resolveApiBaseUrl()` behavior already supports explicit `VITE_API_BASE_URL`, which is the right fit for a split frontend/API deployment.

Documentation should stop implying same-origin production as the only recommended setup. Instead, the docs should explain:

- local same-machine development still defaults cleanly
- same-origin production is optional
- split-origin production is the intended Cloudflare deployment model for this repo prep

## Auth, Cookies, and CORS

This is the main operational wrinkle of the split deployment.

The current app assumes a simpler same-origin production story. With frontend and API deployed separately, the design must make CORS and cookie expectations explicit.

The prep should:

- retain explicit CORS origin configuration through `APP_BASE_URL`
- keep credentialed requests enabled for the frontend to API flow
- document that production cookie behavior must be validated for the chosen domain layout

For this prep, the goal is not to redesign auth. The goal is to make the existing auth configuration deployable and clearly documented for split deployments.

If the frontend and API are deployed to sibling subdomains, the documentation should call out that cookie policy and OAuth callback configuration must be aligned with those production hosts.

## Testing Strategy

Existing route and middleware tests should continue targeting `createApp()` under Node. This is important because it keeps test feedback fast and avoids making Wrangler a prerequisite for routine backend validation.

New tests should focus on the behavior introduced by this prep:

- config loading from Node/process env
- config loading from a Worker-style binding source
- database configuration selection between local and Cloudflare production inputs

The test suite does not need full Hyperdrive integration tests for this prep. Hyperdrive itself is treated as platform infrastructure. The code only needs confidence that it chooses the correct production configuration path.

## Documentation Changes

The repo documentation should be updated to reflect the new target deployment story:

- frontend and backend are separate deploy targets
- the backend deploys with Wrangler as a Worker
- Hyperdrive is required for production PostgreSQL access on Cloudflare
- `VITE_API_BASE_URL` should be set for split-origin production
- OAuth setup must use the real frontend origin and API callback URL

The documentation should also include a short operator checklist for Cloudflare:

- create Hyperdrive configuration
- create Worker vars/secrets
- deploy the backend Worker
- deploy the frontend with the production API URL

## Rollout Plan

This prep should be implemented in a small, low-risk sequence:

1. introduce configuration abstraction and tests
2. add Worker entrypoint and Wrangler config
3. adapt database bootstrap for Hyperdrive-aware production config
4. update docs and example env guidance
5. verify local Node development still works

Each step should preserve the existing local development behavior.

## Risks and Tradeoffs

### Express on Workers

Using Express on Workers is not the most Cloudflare-native architecture, but it is the right short-term tradeoff. It preserves the existing API structure and avoids a costly route rewrite.

### In-memory rate limiting

The current rate limiter is in-memory and per-instance. That is acceptable for this prep, but it is not a durable or globally coordinated limiter at scale. This should be documented as a future improvement rather than solved now.

### Auth behavior under split origins

Cross-origin cookies and OAuth callback coordination are the areas most likely to need careful production validation. The design intentionally keeps the current auth flow, so deployment docs must be explicit about hostnames and callback URLs.

## Success Criteria

This prep is successful when:

- the backend can be deployed as a Cloudflare Worker without changing route contracts
- the frontend can be deployed independently with an explicit API origin
- local backend development still uses the current Node workflow
- PostgreSQL remains in use, with Cloudflare production routed through Hyperdrive
- the repo docs clearly describe the split Cloudflare deployment path
