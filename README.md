# MathSheets

MathSheets is a full-stack worksheet generator inspired by MathSheets. It lets users generate printable arithmetic worksheets, solve them online, save progress locally in anonymous mode, then upgrade to Google sign-in for synced history, statistics, and leaderboard participation.

Worksheets auto-save while in progress, highlight unanswered problems before submission, reveal correctness only after submission, and lock once completed.

Google is used only for authentication. The app keeps Google account details private on the backend and exposes only a user-chosen public nickname to the frontend and leaderboard surfaces.

Public legal pages are available at `/privacy` and `/terms`. Cookie and storage preferences are managed in-app through the `Privacy & cookies` controls in the site footer, and consent is re-requested when the consent version changes.

## Tech stack

- Frontend: Vue 3, Vite, Pinia, Vue Router, Vitest
- Backend: Node.js, Express, TypeScript, Zod, JWT
- Database: PostgreSQL in Docker
- Authentication: Google OAuth 2.0
- E2E testing: Playwright

## Core features

- Anonymous-first worksheet generation with local browser persistence
- Google sign-in for account creation and synced worksheet history
- Configurable worksheet generation:
  - problem count
  - difficulty
  - operations
  - number ranges
  - worksheet size
- Save as draft or partial progress
- Submit and score worksheets
- Saved worksheets grouped into recent timeline sections with filters for status, difficulty, operation, and worksheet size
- Per-user statistics
- Daily, weekly, and monthly leaderboards
- Print-friendly worksheet layout
- One-time local-to-account import confirmation after sign-in

## UX flow highlights

- Google sign-in now continues through a guided nickname and local-import onboarding flow instead of dropping users into separate modal interruptions.
- The dashboard centers the next recommended action first, then shows recent activity and secondary context.
- Worksheets show live answering progress, preserve auto-save feedback, and offer clearer post-submit next actions.
- Saved worksheets expose visible quick filters before row-chip interaction.
- Leaderboards call out the signed-in user's standing and make not-ranked states easier to understand.

## Project structure

```text
mathsheets/
|-- backend/
|   `-- src/
|       |-- config/
|       |-- db/
|       |-- lib/
|       |-- middleware/
|       |-- repositories/
|       |-- routes/
|       |-- schemas/
|       |-- services/
|       |-- tests/
|       `-- types/
|-- e2e/
|   |-- fixtures/
|   |-- specs/
|   `-- utils/
|-- frontend/
|   `-- src/
|       |-- components/
|       |-- composables/
|       |-- lib/
|       |-- router/
|       |-- stores/
|       |-- styles/
|       |-- tests/
|       `-- views/
|-- database/
|   |-- schema.sql
|   |-- seed.sql
|   `-- views.sql
|-- docker-compose.yml
|-- playwright.config.ts
`-- docs/
```

## Architecture decisions

- Anonymous mode is browser-only.
  - Worksheets are stored in `localStorage`.
  - Imported anonymous worksheets sync into account history, but they do not count toward leaderboards or competitive aggregate stats.
- Signed-in mode is backend-owned.
  - The backend generates worksheets, stores question sets, scores submissions, and updates statistics.
- Authentication uses short-lived access tokens plus a refresh-token cookie.
  - The frontend keeps the access token for API requests.
  - The backend owns refresh-token rotation and logout.
- Leaderboards are SQL-driven.
  - PostgreSQL views handle daily, weekly, and monthly leaderboard aggregation.
  - Accuracy rankings require a minimum solved-problem threshold.
- Playwright runs against an isolated `.env.e2e` stack.
  - The suite starts its own frontend and backend servers.
  - Browser console errors, uncaught page errors, and failed API responses fail tests automatically.

## Setup

1. Copy the environment file:

```bash
copy .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Start PostgreSQL in Docker:

```bash
npm run db:up
```

4. Run migrations:

```bash
npm run db:migrate
```

5. Seed sample data:

```bash
npm run db:seed
```

6. Start the backend:

```bash
npm run dev:backend
```

7. Start the frontend in a second terminal:

```bash
npm run dev:frontend
```

Frontend runs on [http://localhost:5173](http://localhost:5173) and the backend runs on [http://localhost:3000](http://localhost:3000).

For the all-in-one Docker Compose stack, use [http://localhost:5180](http://localhost:5180) for the frontend and [http://localhost:3000](http://localhost:3000) for the backend.

The Docker Compose frontend and backend services are configured for development hot reload:

- frontend changes under `frontend/` should update through Vite HMR on `http://localhost:5180`
- backend changes under `backend/` should restart the Express server through `tsx watch`
- if `package-lock.json` changes, the dev containers now reinstall the affected workspace dependencies automatically on next start

You still need `docker compose up --build` after Dockerfile changes or base-image changes, but not just for normal npm dependency additions.

If a dependency install fails during container startup, the container will exit and the logs will show the npm error. Fix the dependency issue, then start the service again.

If you make Dockerfile changes, rebuild the containers:

```bash
docker compose up --build
```

## Docker PostgreSQL

The app uses Docker Compose to run PostgreSQL.

- Container: `mathsheets-postgres`
- Host port: `5433`
- Database: `mathsheets`
- Username: `postgres`
- Password: `postgres`

Useful commands:

```bash
npm run db:up
npm run db:down
npm run db:logs
```

## Google OAuth setup

Create a Google OAuth web application in Google Cloud Console and configure:

- Authorized JavaScript origin: `http://localhost:5173`
- Authorized JavaScript origin for Docker Compose: `http://localhost:5180`
- Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`

For production:

- set the real frontend domain as an authorized JavaScript origin
- set the real backend callback URL as an authorized redirect URI
- if the frontend and API are on different origins, set `VITE_API_BASE_URL` explicitly to the production API URL
- if the frontend and API are same-origin in production, the frontend now defaults to `${window.location.origin}/api`

Then put your credentials into `.env`:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

## Environment variables

Important values:

```env
NODE_ENV=development
PORT=3000
APP_BASE_URL=http://localhost:5173
VITE_API_BASE_URL=http://localhost:3000/api
DATABASE_URL=postgres://postgres:postgres@localhost:5433/mathsheets
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
POSTGRES_PORT=5433
```

Production note:

- keep `VITE_API_BASE_URL` set when serving the frontend from a different origin than the API
- if you deploy the frontend and API under the same origin, you can omit `VITE_API_BASE_URL` and the app will use `/api`

## Production hardening

Current recommended production deployment:

- serve the frontend and backend from the same origin
- terminate traffic over HTTPS only
- let the frontend call the API through `/api`

For this same-origin setup, backend auth cookies are now intentionally configured as:

- `HttpOnly`
- `SameSite=Lax`
- `Secure` in production

If you later split the frontend and API onto different origins or subdomains, revisit the auth cookie and CORS configuration before launch.

## Available scripts

Root:

```bash
npm run dev
npm run build
npm run test
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:install
npm run db:up
npm run db:down
npm run db:migrate
npm run db:seed
npm run db:reset:e2e
```

Workspace-specific:

```bash
npm run dev --workspace backend
npm run dev --workspace frontend
npm run build --workspace backend
npm run build --workspace frontend
npm run test --workspace backend
npm run test --workspace frontend
```

## API overview

Auth:

- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

Worksheets:

- `POST /api/worksheets/generate`
- `POST /api/worksheets`
- `GET /api/worksheets`
- `GET /api/worksheets/:id`
- `PATCH /api/worksheets/:id/save`
- `POST /api/worksheets/:id/submit`
- `POST /api/worksheets/import-local`

User and leaderboard data:

- `GET /api/users/me/stats`
- `GET /api/users/me/history`
- `GET /api/leaderboards`

## Testing

Run backend and frontend unit tests:

```bash
npm run test
```

Install the Playwright browser once:

```bash
npm run test:e2e:install
```

Run the full Playwright suite:

```bash
npm run test:e2e
```

Run a headed browser session for debugging:

```bash
npm run test:e2e:headed -- e2e/specs/routes/landing.spec.ts
```

Reset the E2E database manually if needed:

```bash
npm run db:reset:e2e
```

The E2E suite uses `.env.e2e` plus a test-only backend route at `/api/test-auth/login` when `ENABLE_E2E_AUTH=true`. Keep that flag disabled outside automated testing.

Run builds:

```bash
npm run build
```

## Security Notes

- Worksheet detail, save, and submit endpoints are scoped to the authenticated owner.
- Imported local worksheets sync into account history but do not count toward leaderboards or competitive stats.
- Google OAuth uses a validated `state` value and does not place access tokens in callback URLs.
- Logout revokes the current refresh token server-side.
- Auth, worksheet generation/import, profile update, and leaderboard endpoints now apply basic request throttling.

## Launch Preparation

- Review the pre-launch checklist in [docs/pre-launch-checklist.md](docs/pre-launch-checklist.md) before publishing to a real domain.

## Notes and future extension points

- Teacher and classroom features are intentionally out of scope for v1.
- PDF export can be added later on top of the existing print-friendly worksheet layout.
- Admin usage monitoring, timers, and richer streak tracking fit naturally into the current backend structure.
