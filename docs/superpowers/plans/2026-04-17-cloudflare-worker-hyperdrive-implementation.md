# Cloudflare Worker + Hyperdrive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare MathSheets for split Cloudflare deployment by keeping the Vue frontend independently deployable, adapting the Express backend to Cloudflare Workers, and routing production PostgreSQL access through Hyperdrive without changing API behavior.

**Architecture:** Keep `backend/src/app.ts` as the single source of route and middleware composition, then add a Worker-only entrypoint that boots the same app through Cloudflare's Node compatibility bridge. Replace runtime `.env` assumptions with a small configuration layer that supports local Node execution, tests, and Worker bindings, and make Postgres connection setup lazy so the Worker can install Hyperdrive-backed config before the first query.

**Tech Stack:** Vue 3, Vite, Express 5, TypeScript, Zod, PostgreSQL, pg, Vitest, Wrangler, Cloudflare Workers, Cloudflare Hyperdrive

---

## File Structure

**Create**

- `backend/src/config/runtime-env.ts` - normalized env schema plus Node and Worker loaders
- `backend/src/worker.ts` - Cloudflare Worker entrypoint that adapts the Express app
- `backend/src/tests/runtime-env.test.ts` - config loader tests for Node and Worker sources
- `backend/src/tests/pool.test.ts` - lazy Postgres pool bootstrap tests
- `backend/src/tests/worker-entry.test.ts` - Worker bootstrap tests with mocked Cloudflare modules
- `backend/wrangler.jsonc` - Worker configuration, Hyperdrive binding, and Node compatibility flags
- `docs/superpowers/plans/2026-04-17-cloudflare-worker-hyperdrive-implementation.md` - this plan

**Modify**

- `backend/package.json` - add Wrangler scripts and dev dependency
- `backend/src/config/env.ts` - export the normalized runtime env facade
- `backend/src/db/pool.ts` - make pool creation lazy and resettable
- `backend/src/db/migrate.ts` - close the lazy pool after migrations
- `backend/src/db/seed.ts` - close the lazy pool after seeding
- `backend/src/services/google-oauth.service.ts` - avoid freezing OAuth config at import time
- `README.md` - document split frontend/API Cloudflare deployment and Hyperdrive setup
- `.env.example` - clarify local dev values and split deployment env usage

**Likely unchanged but relevant**

- `backend/src/app.ts`
- `backend/src/server.ts`
- `backend/src/routes/auth.routes.ts`
- `backend/src/lib/jwt.ts`
- `frontend/src/lib/api.ts`
- `frontend/package.json`

### Task 1: Introduce Runtime Env Loaders for Node and Workers

**Files:**
- Create: `backend/src/config/runtime-env.ts`
- Create: `backend/src/tests/runtime-env.test.ts`
- Modify: `backend/src/config/env.ts`
- Modify: `backend/src/services/google-oauth.service.ts`

- [ ] **Step 1: Write the failing runtime env tests**

```ts
// backend/src/tests/runtime-env.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  configureNodeEnv,
  configureWorkerEnv,
  getEnv,
  resetRuntimeEnvForTests
} from "../config/runtime-env.js";

const baseValues = {
  NODE_ENV: "development",
  APP_BASE_URL: "http://localhost:5173",
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
  GOOGLE_CALLBACK_URL: "http://localhost:3000/api/auth/google/callback",
  JWT_ACCESS_SECRET: "access-secret",
  JWT_REFRESH_SECRET: "refresh-secret",
  COOKIE_DOMAIN: "localhost"
};

describe("runtime env loaders", () => {
  beforeEach(() => {
    resetRuntimeEnvForTests();
  });

  it("loads node-style environment values and preserves DATABASE_URL", () => {
    configureNodeEnv({
      ...baseValues,
      DATABASE_URL: "postgres://postgres:postgres@localhost:5433/mathsheets"
    });

    expect(getEnv().DATABASE_URL).toBe("postgres://postgres:postgres@localhost:5433/mathsheets");
    expect(getEnv().NODE_ENV).toBe("development");
  });

  it("prefers the Hyperdrive connection string when Worker bindings are installed", () => {
    configureWorkerEnv({
      ...baseValues,
      NODE_ENV: "production",
      HYPERDRIVE: {
        connectionString: "postgres://hyperdrive-user:secret@hyperdrive.cloudflare.com:5432/mathsheets"
      }
    });

    expect(getEnv().DATABASE_URL).toBe(
      "postgres://hyperdrive-user:secret@hyperdrive.cloudflare.com:5432/mathsheets"
    );
    expect(getEnv().NODE_ENV).toBe("production");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace backend -- src/tests/runtime-env.test.ts`

Expected: FAIL with module-not-found errors for `../config/runtime-env.js`

- [ ] **Step 3: Implement the runtime env loader and env facade**

```ts
// backend/src/config/runtime-env.ts
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const currentDir = dirname(fileURLToPath(import.meta.url));
const dotenvPath = process.env.DOTENV_CONFIG_PATH
  ? resolve(currentDir, "../../../", process.env.DOTENV_CONFIG_PATH)
  : resolve(currentDir, "../../../.env");

const runtimeEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1).optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional().default(""),
  GOOGLE_CALLBACK_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  COOKIE_DOMAIN: z.string().default("localhost"),
  PORT: z.coerce.number().default(3000),
  ENABLE_E2E_AUTH: z
    .string()
    .optional()
    .default("false")
    .transform((value) => value === "true")
});

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;

export type WorkerBindings = Record<string, unknown> & {
  HYPERDRIVE?: { connectionString: string };
};

let runtimeEnv: RuntimeEnv | null = null;

const normalizeSource = (source: Record<string, unknown>) => {
  const databaseUrl =
    typeof source.DATABASE_URL === "string" && source.DATABASE_URL.length > 0
      ? source.DATABASE_URL
      : typeof (source.HYPERDRIVE as { connectionString?: unknown } | undefined)?.connectionString === "string"
        ? String((source.HYPERDRIVE as { connectionString: string }).connectionString)
        : "";

  return runtimeEnvSchema.parse({
    ...source,
    DATABASE_URL: databaseUrl
  });
};

export const configureNodeEnv = (source: Record<string, unknown> = process.env) => {
  config({ path: dotenvPath });
  runtimeEnv = normalizeSource(process.env as Record<string, unknown>);

  if (source !== process.env) {
    runtimeEnv = normalizeSource(source);
  }

  return runtimeEnv;
};

export const configureWorkerEnv = (source: WorkerBindings) => {
  runtimeEnv = normalizeSource(source);
  return runtimeEnv;
};

export const getEnv = () => {
  if (!runtimeEnv) {
    runtimeEnv = configureNodeEnv();
  }

  return runtimeEnv;
};

export const resetRuntimeEnvForTests = () => {
  runtimeEnv = null;
};
```

```ts
// backend/src/config/env.ts
import { getEnv } from "./runtime-env.js";

export const env = new Proxy({} as ReturnType<typeof getEnv>, {
  get(_target, property) {
    return getEnv()[property as keyof ReturnType<typeof getEnv>];
  }
});

export { configureNodeEnv, configureWorkerEnv, getEnv, resetRuntimeEnvForTests } from "./runtime-env.js";
```

```ts
// backend/src/services/google-oauth.service.ts
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import type { GoogleProfile } from "../types/auth.js";

const hasPlaceholderGoogleConfig = () =>
  env.GOOGLE_CLIENT_ID === "your-google-client-id" || env.GOOGLE_CLIENT_SECRET === "your-google-client-secret";

export const isGoogleOAuthConfigured = () =>
  Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && !hasPlaceholderGoogleConfig());

const createGoogleClient = () =>
  isGoogleOAuthConfigured()
    ? new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_CALLBACK_URL)
    : null;

export const exchangeCodeForGoogleProfile = async (code: string): Promise<GoogleProfile> => {
  const googleClient = createGoogleClient();

  if (!googleClient) {
    throw new Error("Google OAuth is not configured");
  }

  const { tokens } = await googleClient.getToken(code);
  const idToken = tokens.id_token;

  if (!idToken) {
    throw new Error("Google response did not include an ID token");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email || !payload.name) {
    throw new Error("Google profile data is incomplete");
  }

  return {
    googleSub: payload.sub,
    email: payload.email,
    displayName: payload.name,
    avatarUrl: payload.picture ?? null
  };
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace backend -- src/tests/runtime-env.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/config/runtime-env.ts backend/src/config/env.ts backend/src/services/google-oauth.service.ts backend/src/tests/runtime-env.test.ts
git commit -m "feat: add runtime env loaders for node and workers"
```

### Task 2: Make PostgreSQL Pool Creation Lazy and Worker-Safe

**Files:**
- Create: `backend/src/tests/pool.test.ts`
- Modify: `backend/src/db/pool.ts`
- Modify: `backend/src/db/migrate.ts`
- Modify: `backend/src/db/seed.ts`

- [ ] **Step 1: Write the failing pool bootstrap test**

```ts
// backend/src/tests/pool.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const endMock = vi.fn();
const poolConstructor = vi.fn(() => ({
  query: queryMock,
  end: endMock
}));

vi.mock("pg", () => ({
  default: {
    Pool: poolConstructor
  }
}));

vi.mock("../config/env.js", () => ({
  env: {
    DATABASE_URL: "postgres://postgres:postgres@localhost:5433/mathsheets"
  }
}));

describe("db pool", () => {
  beforeEach(() => {
    queryMock.mockReset();
    endMock.mockReset();
    poolConstructor.mockClear();
  });

  it("creates the Pool lazily and reuses it across queries", async () => {
    const { pool, resetPoolForTests } = await import("../db/pool.js");

    resetPoolForTests();
    queryMock.mockResolvedValue({ rows: [{ value: 1 }] });

    await pool.query("select 1");
    await pool.query("select 1");

    expect(poolConstructor).toHaveBeenCalledTimes(1);
    expect(poolConstructor).toHaveBeenCalledWith({
      connectionString: "postgres://postgres:postgres@localhost:5433/mathsheets"
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace backend -- src/tests/pool.test.ts`

Expected: FAIL because `resetPoolForTests` does not exist and `pool.ts` creates the pool eagerly

- [ ] **Step 3: Implement lazy pool bootstrapping and explicit shutdown**

```ts
// backend/src/db/pool.ts
import pg from "pg";
import { env } from "../config/env.js";

let sharedPool: pg.Pool | null = null;

export const getPool = () => {
  if (!sharedPool) {
    sharedPool = new pg.Pool({
      connectionString: env.DATABASE_URL
    });
  }

  return sharedPool;
};

export const closePool = async () => {
  if (!sharedPool) {
    return;
  }

  const currentPool = sharedPool;
  sharedPool = null;
  await currentPool.end();
};

export const resetPoolForTests = () => {
  sharedPool = null;
};

export const pool = new Proxy({} as pg.Pool, {
  get(_target, property) {
    const currentPool = getPool();
    const value = currentPool[property as keyof pg.Pool];

    return typeof value === "function" ? value.bind(currentPool) : value;
  }
});
```

```ts
// backend/src/db/migrate.ts
import { readFileSync } from "node:fs";
import { closePool, pool } from "./pool.js";

const schema = readFileSync(new URL("../../../database/schema.sql", import.meta.url), "utf8");
const views = readFileSync(new URL("../../../database/views.sql", import.meta.url), "utf8");

await pool.query(schema);
await pool.query(views);
await closePool();

console.log("database migrated");
```

```ts
// backend/src/db/seed.ts
import { readFileSync } from "node:fs";
import { closePool, pool } from "./pool.js";

const seed = readFileSync(new URL("../../../database/seed.sql", import.meta.url), "utf8");

await pool.query(seed);
await closePool();

console.log("database seeded");
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace backend -- src/tests/pool.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/pool.ts backend/src/db/migrate.ts backend/src/db/seed.ts backend/src/tests/pool.test.ts
git commit -m "feat: lazy-load postgres pool for worker runtime"
```

### Task 3: Add Cloudflare Worker Bootstrap, Wrangler Config, and Backend Scripts

**Files:**
- Create: `backend/src/worker.ts`
- Create: `backend/src/tests/worker-entry.test.ts`
- Create: `backend/wrangler.jsonc`
- Modify: `backend/package.json`

- [ ] **Step 1: Write the failing Worker bootstrap test**

```ts
// backend/src/tests/worker-entry.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const listenMock = vi.fn();
const httpServerHandlerMock = vi.fn(() => ({
  fetch: vi.fn()
}));
const configureWorkerEnvMock = vi.fn();

vi.mock("cloudflare:node", () => ({
  httpServerHandler: httpServerHandlerMock
}));

vi.mock("cloudflare:workers", () => ({
  env: {
    NODE_ENV: "production",
    APP_BASE_URL: "https://app.mathsheets.example",
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "secret",
    GOOGLE_CALLBACK_URL: "https://api.mathsheets.example/api/auth/google/callback",
    JWT_ACCESS_SECRET: "access-secret",
    JWT_REFRESH_SECRET: "refresh-secret",
    COOKIE_DOMAIN: ".mathsheets.example",
    HYPERDRIVE: {
      connectionString: "postgres://worker@hyperdrive.cloudflare.com:5432/mathsheets"
    }
  }
}));

vi.mock("../config/env.js", async () => {
  const actual = await vi.importActual<typeof import("../config/env.js")>("../config/env.js");

  return {
    ...actual,
    configureWorkerEnv: configureWorkerEnvMock
  };
});

vi.mock("../app.js", () => ({
  createApp: () => ({
    listen: listenMock
  })
}));

describe("worker bootstrap", () => {
  beforeEach(() => {
    listenMock.mockReset();
    httpServerHandlerMock.mockClear();
    configureWorkerEnvMock.mockReset();
  });

  it("installs worker bindings, starts the express app, and exports a Cloudflare handler", async () => {
    const workerModule = await import("../worker.js");

    expect(configureWorkerEnvMock).toHaveBeenCalledTimes(1);
    expect(listenMock).toHaveBeenCalledWith(3000);
    expect(httpServerHandlerMock).toHaveBeenCalledWith({ port: 3000 });
    expect(workerModule.default).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace backend -- src/tests/worker-entry.test.ts`

Expected: FAIL with module-not-found errors for `../worker.js`

- [ ] **Step 3: Implement the Worker entrypoint and Wrangler project**

```ts
// backend/src/worker.ts
import { env as workerEnv } from "cloudflare:workers";
import { httpServerHandler } from "cloudflare:node";
import { createApp } from "./app.js";
import { configureWorkerEnv } from "./config/env.js";

configureWorkerEnv(workerEnv);

const app = createApp();

app.listen(3000);

export default httpServerHandler({ port: 3000 });
```

```jsonc
// backend/wrangler.jsonc
{
  "$schema": "../node_modules/wrangler/config-schema.json",
  "name": "mathsheets-api",
  "main": "src/worker.ts",
  "compatibility_date": "2026-04-17",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true
  },
  "vars": {
    "NODE_ENV": "production",
    "APP_BASE_URL": "https://app.mathsheets.example",
    "GOOGLE_CALLBACK_URL": "https://api.mathsheets.example/api/auth/google/callback",
    "COOKIE_DOMAIN": ".mathsheets.example"
  },
  "hyperdrive": [
    {
      "binding": "HYPERDRIVE",
      "id": "paste-the-id-returned-by-wrangler-hyperdrive-create",
      "localConnectionString": "postgres://postgres:postgres@localhost:5433/mathsheets"
    }
  ]
}
```

```json
// backend/package.json
{
  "name": "backend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nodemon --legacy-watch --watch src --ext ts --exec \"tsx src/server.ts\"",
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "migrate": "tsx src/db/migrate.ts",
    "seed": "tsx src/db/seed.ts",
    "cf:dev": "wrangler dev",
    "cf:dev:remote": "wrangler dev --remote",
    "cf:deploy": "wrangler deploy",
    "cf:typegen": "wrangler types"
  },
  "dependencies": {
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^17.2.2",
    "express": "^5.1.0",
    "google-auth-library": "^10.3.0",
    "helmet": "^8.1.0",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.16.3",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.9",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.3",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^24.3.1",
    "@types/pg": "^8.15.5",
    "@types/supertest": "^6.0.3",
    "nodemon": "^3.1.10",
    "supertest": "^7.1.4",
    "tsx": "^4.20.5",
    "typescript": "^5.9.2",
    "vitest": "^3.2.4",
    "wrangler": "^4.44.0"
  }
}
```

- [ ] **Step 4: Run the tests and backend build to verify they pass**

Run: `npm run test --workspace backend -- src/tests/worker-entry.test.ts src/tests/runtime-env.test.ts src/tests/pool.test.ts`

Expected: PASS

Run: `npm run build --workspace backend`

Expected: PASS

- [ ] **Step 5: Create the Hyperdrive binding and commit**

Run: `npm --workspace backend exec wrangler hyperdrive create mathsheets-db`

Expected: SUCCESS with a Hyperdrive ID in the terminal output

Then update `backend/wrangler.jsonc` so the `hyperdrive[0].id` value is the exact ID returned by the command.

```bash
git add backend/package.json backend/wrangler.jsonc backend/src/worker.ts backend/src/tests/worker-entry.test.ts package-lock.json
git commit -m "feat: add cloudflare worker bootstrap for api"
```

### Task 4: Update Docs and Example Env for Split Cloudflare Deployment

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

- [ ] **Step 1: Review the current deployment guidance before editing docs**

Run: `Select-String -Path README.md,.env.example -Pattern "same-origin|Cloudflare|VITE_API_BASE_URL|GOOGLE_CALLBACK_URL"`

Expected: The output still emphasizes same-origin production and does not yet describe the split Cloudflare deployment path

- [ ] **Step 2: Update the docs and example env**

```env
# .env.example
NODE_ENV=development
PORT=3000
APP_BASE_URL=http://localhost:5173
VITE_API_BASE_URL=http://localhost:3000/api
DATABASE_URL=postgres://postgres:postgres@localhost:5433/mathsheets
POSTGRES_DB=mathsheets
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5433
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
COOKIE_DOMAIN=localhost
```

```md
<!-- README.md -->
## Cloudflare deployment

MathSheets is prepared for a split Cloudflare deployment:

- `frontend/` deploys independently as a static Vite application
- `backend/` deploys independently as a Cloudflare Worker
- PostgreSQL remains the system of record and is accessed from the Worker through Hyperdrive

### Backend Worker setup

From `backend/`:

```bash
npm install
npm run cf:typegen
npm run cf:deploy
```

Before the first deploy:

1. Create a Hyperdrive configuration:

```bash
npm --workspace backend exec wrangler hyperdrive create mathsheets-db
```

2. Copy the returned Hyperdrive ID into `backend/wrangler.jsonc`
3. Set Worker secrets for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `GOOGLE_CLIENT_SECRET`
4. Set Worker vars for `APP_BASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CALLBACK_URL`, and `COOKIE_DOMAIN`

### Frontend deployment

Deploy the frontend separately and set:

```env
VITE_API_BASE_URL=https://api.mathsheets.example/api
```

### OAuth and cookies

For split deployments:

- use the real frontend hostname as the Google OAuth JavaScript origin
- use the real API hostname for `GOOGLE_CALLBACK_URL`
- verify cookie and CORS behavior against your production subdomains before launch
```

- [ ] **Step 3: Run the runtime env tests to keep the env contract green**

Run: `npm run test --workspace backend -- src/tests/runtime-env.test.ts`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add README.md .env.example
git commit -m "docs: add cloudflare split deployment guidance"
```

### Task 5: Final Verification

**Files:**
- Verify only

- [ ] **Step 1: Run the focused backend test suite**

Run: `npm run test --workspace backend -- src/tests/runtime-env.test.ts src/tests/pool.test.ts src/tests/worker-entry.test.ts src/tests/app.security.test.ts src/tests/auth.routes.security.test.ts src/tests/user.routes.test.ts`

Expected: PASS

- [ ] **Step 2: Run the backend build**

Run: `npm run build --workspace backend`

Expected: PASS

- [ ] **Step 3: Generate Worker types**

Run: `npm run cf:typegen --workspace backend`

Expected: PASS and updated Worker type definitions in the backend workspace

- [ ] **Step 4: Validate the Worker package without deploying**

Run: `npm run cf:deploy --workspace backend -- --dry-run`

Expected: PASS with a packaged Worker bundle and no config errors

- [ ] **Step 5: Run the frontend build**

Run: `npm run build --workspace frontend`

Expected: PASS

- [ ] **Step 6: Review the final contract-sensitive files**

Run: `git diff -- README.md .env.example backend/src/config/env.ts backend/src/config/runtime-env.ts backend/src/db/pool.ts backend/src/worker.ts backend/wrangler.jsonc`

Expected: The diff shows:

- the API still mounts under `/api`
- the frontend remains independently deployable
- the backend runtime now supports both local Node config and Worker bindings
- production PostgreSQL connectivity flows through Hyperdrive configuration

- [ ] **Step 7: Commit any final cleanup**

```bash
git add backend/src/config/runtime-env.ts backend/src/config/env.ts backend/src/db/pool.ts backend/src/db/migrate.ts backend/src/db/seed.ts backend/src/services/google-oauth.service.ts backend/src/worker.ts backend/src/tests/runtime-env.test.ts backend/src/tests/pool.test.ts backend/src/tests/worker-entry.test.ts backend/package.json backend/wrangler.jsonc README.md .env.example package-lock.json
git commit -m "chore: prep backend for cloudflare workers and hyperdrive"
```

---

## Self-Review

**Spec coverage**

- split frontend/API deployment: Tasks 3 and 4
- Worker-based Express backend: Task 3
- Hyperdrive-backed PostgreSQL in production: Tasks 1, 2, and 3
- preserve local Node development: Tasks 1, 2, and 5
- targeted runtime/config tests: Tasks 1, 2, and 3
- deployment docs and env guidance: Task 4

No spec requirements are uncovered.

**Placeholder scan**

- No unfinished placeholder markers remain
- The only runtime value not knowable in advance is the Hyperdrive ID returned by `wrangler hyperdrive create`, and the plan explicitly captures the command that produces it before the Wrangler config is finalized

**Type consistency**

- runtime config stays exposed as `env.<NAME>` throughout the backend
- database access continues to use `pool.query(...)`
- Cloudflare production database access resolves through `env.DATABASE_URL`, which is derived from the Hyperdrive binding when Worker bindings are installed
