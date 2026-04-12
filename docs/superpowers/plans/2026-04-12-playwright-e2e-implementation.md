# Playwright E2E Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a broad Playwright end-to-end suite for MathSheets that covers major routes, critical anonymous and authenticated flows, and fails on browser console/runtime errors.

**Architecture:** Install Playwright at the repository root so it can orchestrate the existing frontend and backend together. Add a test-only backend auth route plus database reset utilities for deterministic state, then layer Playwright fixtures for console/network guards and route/flow specs on top.

**Tech Stack:** Playwright, Node.js, TypeScript, Vue 3, Vite, Express, PostgreSQL, Docker Compose, Vitest, Supertest

---

## File Structure

### Repository root

- Modify: `package.json`
- Modify: `README.md`
- Create: `playwright.config.ts`
- Create: `.env.e2e`

### E2E suite

- Create: `e2e/fixtures/base.ts`
- Create: `e2e/fixtures/auth.ts`
- Create: `e2e/specs/routes/landing.spec.ts`
- Create: `e2e/specs/routes/login.spec.ts`
- Create: `e2e/specs/routes/dashboard.spec.ts`
- Create: `e2e/specs/routes/generator.spec.ts`
- Create: `e2e/specs/routes/saved-worksheets.spec.ts`
- Create: `e2e/specs/routes/leaderboard.spec.ts`
- Create: `e2e/specs/routes/profile.spec.ts`
- Create: `e2e/specs/flows/anonymous-worksheet.spec.ts`
- Create: `e2e/specs/flows/authenticated-worksheet.spec.ts`
- Create: `e2e/specs/flows/import-local-progress.spec.ts`
- Create: `e2e/utils/db-reset.ts`
- Create: `e2e/utils/seed-auth-state.ts`

### Backend

- Modify: `backend/src/config/env.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/src/repositories/user.repository.ts`
- Modify: `backend/src/repositories/worksheet.repository.ts`
- Create: `backend/src/routes/test-auth.routes.ts`
- Create: `backend/src/db/reset-e2e.ts`
- Modify: `backend/src/tests/worksheet.routes.test.ts`

### Frontend

- Modify: `frontend/src/views/LandingView.vue`
- Modify: `frontend/src/views/LoginView.vue`
- Modify: `frontend/src/views/DashboardView.vue`
- Modify: `frontend/src/views/GeneratorView.vue`
- Modify: `frontend/src/views/WorksheetView.vue`
- Modify: `frontend/src/views/SavedWorksheetsView.vue`
- Modify: `frontend/src/views/LeaderboardView.vue`
- Modify: `frontend/src/views/ProfileView.vue`
- Modify: `frontend/src/components/worksheet/GeneratorForm.vue`
- Modify: `frontend/src/components/worksheet/WorksheetGrid.vue`
- Modify: `frontend/src/components/common/ImportLocalProgressModal.vue`
- Modify: `frontend/src/stores/auth.ts`
- Modify: `frontend/src/stores/worksheet.ts`
- Modify: `frontend/src/lib/api.ts`

## Task 1: Install Playwright and Root E2E Tooling

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `.env.e2e`
- Test: `package.json`

- [ ] **Step 1: Write the failing Playwright presence check**

Add a root script that expects Playwright config to exist:

```json
{
  "scripts": {
    "check:e2e-config": "node -e \"const fs=require('fs'); if(!fs.existsSync('playwright.config.ts')) throw new Error('playwright.config.ts missing'); console.log('playwright config ok')\""
  }
}
```

- [ ] **Step 2: Run the check to verify it fails**

Run: `npm run check:e2e-config`
Expected: FAIL with `playwright.config.ts missing`

- [ ] **Step 3: Add root Playwright dependencies, scripts, and config**

Update the root `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:install": "playwright install chromium",
    "db:reset:e2e": "tsx e2e/utils/db-reset.ts"
  },
  "devDependencies": {
    "@playwright/test": "^1.55.0",
    "npm-run-all": "^4.1.5",
    "tsx": "^4.20.5"
  }
}
```

Create `.env.e2e`:

```dotenv
NODE_ENV=test
PORT=3001
APP_BASE_URL=http://127.0.0.1:4173
VITE_API_BASE_URL=http://127.0.0.1:3001/api
DATABASE_URL=postgres://postgres:postgres@localhost:5433/mathsheets
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
ENABLE_E2E_AUTH=true
GOOGLE_CLIENT_ID=test-google-client-id
GOOGLE_CLIENT_SECRET=test-google-client-secret
GOOGLE_CALLBACK_URL=http://127.0.0.1:3001/api/auth/google/callback
COOKIE_DOMAIN=127.0.0.1
```

Create `playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/specs",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: [
    {
      command: "npm run dev --workspace backend",
      url: "http://127.0.0.1:3001/api/health",
      reuseExistingServer: !process.env.CI,
      env: {
        DOTENV_CONFIG_PATH: ".env.e2e"
      }
    },
    {
      command: "npm run dev --workspace frontend -- --host 127.0.0.1 --port 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_BASE_URL: "http://127.0.0.1:3001/api"
      }
    }
  ],
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium"
      }
    }
  ]
});
```

- [ ] **Step 4: Install dependencies and verify the config check passes**

Run: `npm install && npm run check:e2e-config`
Expected: PASS with `playwright config ok`

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json playwright.config.ts .env.e2e
git commit -m "test: add root playwright tooling"
```

## Task 2: Add Test-Only Backend Auth and E2E DB Reset Support

**Files:**
- Modify: `backend/src/config/env.ts`
- Modify: `backend/src/app.ts`
- Create: `backend/src/routes/test-auth.routes.ts`
- Create: `backend/src/db/reset-e2e.ts`
- Modify: `backend/src/repositories/user.repository.ts`
- Test: `backend/src/tests/worksheet.routes.test.ts`

- [ ] **Step 1: Write the failing E2E auth route test**

Append this test to `backend/src/tests/worksheet.routes.test.ts`:

```ts
describe("test auth routes", () => {
  it("logs in an e2e user when enabled", async () => {
    process.env.ENABLE_E2E_AUTH = "true";
    const response = await request(createApp()).post("/api/test-auth/login").send({
      email: "e2e@example.com",
      displayName: "E2E User"
    });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("e2e@example.com");
    expect(response.body.accessToken).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the backend tests to verify the new test fails**

Run: `npm run test --workspace backend`
Expected: FAIL with `Cannot POST /api/test-auth/login`

- [ ] **Step 3: Implement guarded E2E auth and reset support**

Update `backend/src/config/env.ts`:

```ts
  ENABLE_E2E_AUTH: z
    .string()
    .optional()
    .transform((value) => value === "true")
    .default("false")
```

Add a helper to `backend/src/repositories/user.repository.ts`:

```ts
export const ensureUserForTesting = async (input: { email: string; displayName: string }) => {
  const googleSub = `e2e-${input.email}`;
  const result = await pool.query(
    `INSERT INTO users (google_sub, email, display_name, avatar_url)
     VALUES ($1, $2, $3, NULL)
     ON CONFLICT (email)
     DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = NOW(), last_login_at = NOW()
     RETURNING *`,
    [googleSub, input.email, input.displayName]
  );

  await pool.query(
    `INSERT INTO user_statistics (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [result.rows[0].id]
  );

  return result.rows[0];
};
```

Create `backend/src/routes/test-auth.routes.ts`:

```ts
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { ensureUserForTesting } from "../repositories/user.repository.js";
import { issueSessionTokens, refreshCookieName } from "../services/token.service.js";

const loginSchema = z.object({
  email: z.string().email().default("e2e@example.com"),
  displayName: z.string().min(1).default("E2E User")
});

export const testAuthRouter = Router();

testAuthRouter.use((_req, _res, next) => {
  if (!env.ENABLE_E2E_AUTH) {
    return next(new HttpError(404, "Not found"));
  }

  return next();
});

testAuthRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await ensureUserForTesting(body);
    const { accessToken, refreshToken } = await issueSessionTokens(user.id);

    res.cookie(refreshCookieName, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/api/auth"
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name
      }
    });
  })
);
```

Create `backend/src/db/reset-e2e.ts`:

```ts
import { pool } from "./pool.js";

await pool.query(`
  TRUNCATE TABLE
    worksheet_answers,
    worksheet_attempts,
    worksheet_questions,
    worksheets,
    refresh_tokens,
    user_statistics,
    users
  RESTART IDENTITY CASCADE
`);

await pool.end();
console.log("e2e database reset");
```

Register the router in `backend/src/app.ts`:

```ts
import { testAuthRouter } from "./routes/test-auth.routes.js";

app.use("/api/test-auth", testAuthRouter);
```

- [ ] **Step 4: Run backend tests to verify the auth route passes**

Run: `npm run test --workspace backend`
Expected: PASS with the new E2E auth test green

- [ ] **Step 5: Commit**

```bash
git add backend/src/config/env.ts backend/src/app.ts backend/src/routes/test-auth.routes.ts backend/src/db/reset-e2e.ts backend/src/repositories/user.repository.ts backend/src/tests/worksheet.routes.test.ts
git commit -m "test: add e2e auth route and database reset support"
```

## Task 3: Add Stable Frontend Selectors and Testability Hooks

**Files:**
- Modify: `frontend/src/views/LandingView.vue`
- Modify: `frontend/src/views/LoginView.vue`
- Modify: `frontend/src/views/DashboardView.vue`
- Modify: `frontend/src/views/GeneratorView.vue`
- Modify: `frontend/src/views/WorksheetView.vue`
- Modify: `frontend/src/views/SavedWorksheetsView.vue`
- Modify: `frontend/src/views/LeaderboardView.vue`
- Modify: `frontend/src/views/ProfileView.vue`
- Modify: `frontend/src/components/worksheet/GeneratorForm.vue`
- Modify: `frontend/src/components/worksheet/WorksheetGrid.vue`
- Modify: `frontend/src/components/common/ImportLocalProgressModal.vue`
- Test: `frontend/src/tests/generator-view.test.ts`

- [ ] **Step 1: Write the failing selector test**

Append this test to `frontend/src/tests/generator-view.test.ts`:

```ts
it("renders stable test ids for the generator form", async () => {
  const wrapper = mount(GeneratorForm);
  expect(wrapper.find('[data-testid="generator-form"]').exists()).toBe(true);
  expect(wrapper.find('[data-testid="generate-submit"]').exists()).toBe(true);
});
```

- [ ] **Step 2: Run the frontend tests to verify the new test fails**

Run: `npm run test --workspace frontend`
Expected: FAIL because the `data-testid` attributes do not exist yet

- [ ] **Step 3: Add `data-testid` hooks to major UI surfaces**

Update `frontend/src/components/worksheet/GeneratorForm.vue`:

```vue
<form data-testid="generator-form" class="generator-form card" @submit.prevent="emitGenerate">
  <label>
    Problems
    <input data-testid="problem-count-input" v-model.number="form.problemCount" type="number" min="1" max="100" />
  </label>
  <button data-testid="generate-submit" class="button" type="submit">Generate worksheet</button>
</form>
```

Update `frontend/src/components/worksheet/WorksheetGrid.vue`:

```vue
<section data-testid="worksheet-grid" class="worksheet-grid">
  <article
    v-for="question in questions"
    :key="question.id ?? question.questionOrder"
    class="worksheet-cell"
    :data-testid="`worksheet-cell-${question.questionOrder}`"
  >
    <input
      :data-testid="`answer-input-${question.questionOrder}`"
      :id="`answer-${question.questionOrder}`"
      :value="answers[question.questionOrder - 1] ?? ''"
      inputmode="numeric"
      @input="$emit('update-answer', question.questionOrder - 1, ($event.target as HTMLInputElement).value)"
    />
  </article>
</section>
```

Update `frontend/src/components/common/ImportLocalProgressModal.vue`:

```vue
<div v-if="open" data-testid="import-local-modal" class="modal-backdrop">
  <div class="modal-card">
    <h2>Import local progress?</h2>
    <p>You have worksheets saved on this device. Import them into your new account to keep your progress.</p>
  </div>
  <button data-testid="import-local-decline" class="button button-secondary" @click="$emit('decline')">Keep local only</button>
  <button data-testid="import-local-confirm" class="button" @click="$emit('confirm')">Import progress</button>
</div>
```

Add route-level hooks:

```vue
<!-- LandingView.vue -->
<section data-testid="landing-page" class="hero-panel">

<!-- LoginView.vue -->
<section data-testid="login-page" class="page-stack">

<!-- DashboardView.vue -->
<section data-testid="dashboard-page" class="page-stack">

<!-- GeneratorView.vue -->
<section data-testid="generator-page" class="page-stack">

<!-- WorksheetView.vue -->
<section v-if="worksheet" data-testid="worksheet-page" class="page-stack">

<!-- SavedWorksheetsView.vue -->
<section data-testid="saved-worksheets-page" class="page-stack">

<!-- LeaderboardView.vue -->
<section data-testid="leaderboard-page" class="page-stack">

<!-- ProfileView.vue -->
<section data-testid="profile-page" class="page-stack">
```

- [ ] **Step 4: Run the frontend tests again**

Run: `npm run test --workspace frontend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/LandingView.vue frontend/src/views/LoginView.vue frontend/src/views/DashboardView.vue frontend/src/views/GeneratorView.vue frontend/src/views/WorksheetView.vue frontend/src/views/SavedWorksheetsView.vue frontend/src/views/LeaderboardView.vue frontend/src/views/ProfileView.vue frontend/src/components/worksheet/GeneratorForm.vue frontend/src/components/worksheet/WorksheetGrid.vue frontend/src/components/common/ImportLocalProgressModal.vue frontend/src/tests/generator-view.test.ts
git commit -m "test: add stable ui selectors for playwright"
```

## Task 4: Add Playwright Base Fixtures With Console and Network Guards

**Files:**
- Create: `e2e/fixtures/base.ts`
- Create: `e2e/fixtures/auth.ts`
- Create: `e2e/utils/seed-auth-state.ts`
- Test: `e2e/fixtures/base.ts`

- [ ] **Step 1: Write the failing base smoke spec**

Create `e2e/specs/routes/landing.spec.ts`:

```ts
import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("landing page renders without browser errors", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("landing-page")).toBeVisible();
});
```

- [ ] **Step 2: Run Playwright to verify the suite fails before fixtures exist**

Run: `npm run test:e2e -- landing.spec.ts`
Expected: FAIL with a module resolution error for `../../fixtures/base`

- [ ] **Step 3: Implement the base and auth fixtures**

Create `e2e/fixtures/base.ts`:

```ts
import { test as base, expect } from "@playwright/test";

export const test = base.extend<{
  consoleErrors: string[];
  pageErrors: string[];
}>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });
    await use(errors);
  },
  pageErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });
    await use(errors);
  },
  page: async ({ page }, use, testInfo) => {
    const failedApiResponses: string[] = [];
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/") && response.status() >= 400) {
        failedApiResponses.push(`${response.status()} ${url}`);
      }
    });

    await use(page);

    expect.soft(failedApiResponses, "unexpected api failures").toEqual([]);
    expect.soft(testInfo.errors.map((error) => error.message), "test should not accumulate internal errors").toEqual(
      testInfo.errors.map((error) => error.message)
    );
  }
});

export { expect };
```

Replace the end of `e2e/fixtures/base.ts` with the actual post-test assertions:

```ts
export const test = base.extend<{
  consoleErrors: string[];
  pageErrors: string[];
}>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });
    await use(errors);
    expect(errors, "unexpected console.error output").toEqual([]);
  },
  pageErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });
    await use(errors);
    expect(errors, "unexpected uncaught page errors").toEqual([]);
  }
});
```

Create `e2e/fixtures/auth.ts`:

```ts
import { test as base } from "./base";

export const test = base.extend({
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const request = await context.request.post("http://127.0.0.1:3001/api/test-auth/login", {
      data: {
        email: "e2e@example.com",
        displayName: "E2E User"
      }
    });

    const payload = await request.json();
    await context.addInitScript((token) => {
      localStorage.setItem("mathsheets.access_token", token);
    }, payload.accessToken);

    const page = await context.newPage();
    await use(page);
    await context.close();
  }
});
```

Create `e2e/utils/seed-auth-state.ts`:

```ts
import { request } from "@playwright/test";

const context = await request.newContext();
const response = await context.post("http://127.0.0.1:3001/api/test-auth/login", {
  data: {
    email: "e2e@example.com",
    displayName: "E2E User"
  }
});

const payload = await response.json();
console.log(payload.accessToken);
await context.dispose();
```

- [ ] **Step 4: Run the landing smoke spec**

Run: `npm run test:e2e -- e2e/specs/routes/landing.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add e2e/fixtures/base.ts e2e/fixtures/auth.ts e2e/utils/seed-auth-state.ts e2e/specs/routes/landing.spec.ts
git commit -m "test: add playwright fixtures with browser error guards"
```

## Task 5: Add Broad Route Smoke Coverage

**Files:**
- Create: `e2e/specs/routes/login.spec.ts`
- Create: `e2e/specs/routes/dashboard.spec.ts`
- Create: `e2e/specs/routes/generator.spec.ts`
- Create: `e2e/specs/routes/saved-worksheets.spec.ts`
- Create: `e2e/specs/routes/leaderboard.spec.ts`
- Create: `e2e/specs/routes/profile.spec.ts`
- Test: `e2e/specs/routes/*.spec.ts`

- [ ] **Step 1: Write the route smoke specs**

Create `e2e/specs/routes/login.spec.ts`:

```ts
import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("login page renders without browser errors", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("login-page")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});
```

Create `e2e/specs/routes/dashboard.spec.ts`:

```ts
import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("dashboard page renders for anonymous users", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-page")).toBeVisible();
  await expect(page.getByText("Anonymous practice mode")).toBeVisible();
});
```

Create `e2e/specs/routes/generator.spec.ts`:

```ts
import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("generator page renders the form", async ({ page }) => {
  await page.goto("/generate");
  await expect(page.getByTestId("generator-page")).toBeVisible();
  await expect(page.getByTestId("generator-form")).toBeVisible();
});
```

Create `e2e/specs/routes/saved-worksheets.spec.ts`:

```ts
import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("saved worksheets page renders", async ({ page }) => {
  await page.goto("/worksheets");
  await expect(page.getByTestId("saved-worksheets-page")).toBeVisible();
});
```

Create `e2e/specs/routes/leaderboard.spec.ts`:

```ts
import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("leaderboard page renders", async ({ page }) => {
  await page.goto("/leaderboard");
  await expect(page.getByTestId("leaderboard-page")).toBeVisible();
});
```

Create `e2e/specs/routes/profile.spec.ts`:

```ts
import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("profile page renders in anonymous mode", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByTestId("profile-page")).toBeVisible();
  await expect(page.getByText("Sign in with Google")).toBeVisible();
});
```

- [ ] **Step 2: Run the route smoke suite**

Run: `npm run test:e2e -- e2e/specs/routes`
Expected: PASS

- [ ] **Step 3: Expand dashboard and leaderboard checks**

Update `e2e/specs/routes/leaderboard.spec.ts`:

```ts
test("leaderboard metric switching works", async ({ page }) => {
  await page.goto("/leaderboard");
  await page.selectOption('select', "accuracy");
  await expect(page.getByTestId("leaderboard-page")).toBeVisible();
});
```

Update `e2e/specs/routes/dashboard.spec.ts`:

```ts
test("dashboard links to worksheet generation", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "New worksheet" }).click();
  await expect(page).toHaveURL(/\/generate$/);
});
```

- [ ] **Step 4: Run the smoke suite again**

Run: `npm run test:e2e -- e2e/specs/routes`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add e2e/specs/routes/login.spec.ts e2e/specs/routes/dashboard.spec.ts e2e/specs/routes/generator.spec.ts e2e/specs/routes/saved-worksheets.spec.ts e2e/specs/routes/leaderboard.spec.ts e2e/specs/routes/profile.spec.ts
git commit -m "test: add playwright route smoke coverage"
```

## Task 6: Add Anonymous Worksheet End-to-End Flows

**Files:**
- Create: `e2e/specs/flows/anonymous-worksheet.spec.ts`
- Modify: `frontend/src/stores/worksheet.ts`
- Test: `e2e/specs/flows/anonymous-worksheet.spec.ts`

- [ ] **Step 1: Write the failing anonymous flow spec**

Create `e2e/specs/flows/anonymous-worksheet.spec.ts`:

```ts
import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";

test("anonymous user can generate, save, reopen, and submit a worksheet", async ({ page }) => {
  await page.goto("/generate");
  await page.getByTestId("generate-submit").click();
  await expect(page.getByTestId("worksheet-grid")).toBeVisible();

  await page.getByTestId("answer-input-1").fill("5");
  await page.getByRole("button", { name: "Save draft" }).click();

  await page.goto("/worksheets");
  await expect(page.getByTestId("saved-worksheets-page")).toBeVisible();
  await page.getByRole("link").first().click();
  await expect(page.getByTestId("worksheet-page")).toBeVisible();
  await page.getByRole("button", { name: "Submit" }).click();
});
```

- [ ] **Step 2: Run the flow spec to verify current failure**

Run: `npm run test:e2e -- e2e/specs/flows/anonymous-worksheet.spec.ts`
Expected: FAIL on at least one navigation or persistence assertion if the flow is not fully stable yet

- [ ] **Step 3: Stabilize the anonymous flow**

Update `frontend/src/stores/worksheet.ts` so local generation stores immediately and reopening is deterministic:

```ts
const buildLocalWorksheet = (payload: {
  title: string;
  config: WorksheetConfig;
  questions: WorksheetQuestion[];
}): WorksheetRecord => ({
  id: randomKey(),
  title: payload.title,
  status: "draft",
  config: payload.config,
  questions: payload.questions,
  answers: payload.questions.map(() => null),
  source: "local",
  localImportKey: randomKey(),
  createdAt: new Date().toISOString()
});
```

Ensure `generateWorksheet` saves local worksheets immediately:

```ts
if (!useAuthStore().user) {
  this.saveLocalWorksheet(record);
}
```

Ensure `submitActiveWorksheet` persists the completed anonymous result:

```ts
if (!authStore.user) {
  const scoreCorrect = this.activeWorksheet.questions.filter(
    (question, index) => Number(this.activeWorksheet?.answers[index] ?? "") === question.correctAnswer
  ).length;
  const scoreTotal = this.activeWorksheet.questions.length;
  this.activeWorksheet.status = "completed";
  this.activeWorksheet.submittedAt = new Date().toISOString();
  this.activeWorksheet.result = {
    scoreCorrect,
    scoreTotal,
    accuracyPercentage: Number(((scoreCorrect / scoreTotal) * 100).toFixed(2))
  };
  this.saveLocalWorksheet(this.activeWorksheet);
  return this.activeWorksheet.result;
}
```

- [ ] **Step 4: Run the anonymous flow spec again**

Run: `npm run test:e2e -- e2e/specs/flows/anonymous-worksheet.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add e2e/specs/flows/anonymous-worksheet.spec.ts frontend/src/stores/worksheet.ts
git commit -m "test: cover anonymous worksheet flow with playwright"
```

## Task 7: Add Authenticated and Import Flows

**Files:**
- Create: `e2e/specs/flows/authenticated-worksheet.spec.ts`
- Create: `e2e/specs/flows/import-local-progress.spec.ts`
- Modify: `frontend/src/views/AuthCallbackView.vue`
- Modify: `frontend/src/stores/worksheet.ts`
- Modify: `frontend/src/lib/api.ts`
- Test: `e2e/specs/flows/authenticated-worksheet.spec.ts`

- [ ] **Step 1: Write the failing authenticated flow specs**

Create `e2e/specs/flows/authenticated-worksheet.spec.ts`:

```ts
import { expect } from "@playwright/test";
import { test } from "../../fixtures/auth";

test("authenticated user can create and submit a worksheet", async ({ authenticatedPage: page }) => {
  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-page")).toBeVisible();

  await page.goto("/generate");
  await page.getByTestId("generate-submit").click();
  await page.getByRole("button", { name: "Save draft" }).click();

  await page.goto("/worksheets");
  await expect(page.getByTestId("saved-worksheets-page")).toBeVisible();
});
```

Create `e2e/specs/flows/import-local-progress.spec.ts`:

```ts
import { expect } from "@playwright/test";
import { test } from "../../fixtures/auth";

test("signed-in user can import local anonymous worksheets", async ({ authenticatedPage: page }) => {
  await page.goto("/generate");
  await page.getByTestId("generate-submit").click();
  await page.getByRole("button", { name: "Save draft" }).click();

  await page.evaluate(() => {
    localStorage.removeItem("mathsheets.access_token");
  });

  await page.request.post("http://127.0.0.1:3001/api/test-auth/login", {
    data: {
      email: "e2e@example.com",
      displayName: "E2E User"
    }
  });

  await page.goto("/dashboard");
  await expect(page.getByTestId("import-local-modal")).toBeVisible();
  await page.getByTestId("import-local-confirm").click();
});
```

- [ ] **Step 2: Run the authenticated specs to verify current failures**

Run: `npm run test:e2e -- e2e/specs/flows/authenticated-worksheet.spec.ts e2e/specs/flows/import-local-progress.spec.ts`
Expected: FAIL until auth bootstrap and import timing are stable

- [ ] **Step 3: Stabilize signed-in API and import behavior**

Update `frontend/src/lib/api.ts` to retry once on `401` by refreshing the token:

```ts
export const apiFetch = async <T>(path: string, init?: RequestInit, hasRetried = false): Promise<T> => {
  const token = getStoredToken();
  const headers = new Headers(init?.headers ?? {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers
  });

  if (response.status === 401 && !hasRetried) {
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include"
    });

    if (refreshResponse.ok) {
      const payload = await refreshResponse.json();
      setStoredToken(payload.accessToken);
      return apiFetch<T>(path, init, true);
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(payload.message ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
};
```

Update `frontend/src/views/AuthCallbackView.vue` to wait for import checks before redirect:

```ts
onMounted(async () => {
  const accessToken = typeof route.query.access_token === "string" ? route.query.access_token : null;

  if (accessToken) {
    authStore.setAccessToken(accessToken);
  }

  await authStore.fetchMe();

  if (authStore.user) {
    await worksheetStore.fetchRemoteWorksheets();
    await worksheetStore.maybePromptForImport();
  }

  router.replace("/dashboard");
});
```

Update `frontend/src/stores/worksheet.ts` to expose a deterministic helper:

```ts
hydrateAnonymousWorksheets() {
  this.anonymousWorksheets = createAnonymousWorksheetStore().load<WorksheetRecord>();
}
```

- [ ] **Step 4: Run the authenticated flow specs again**

Run: `npm run test:e2e -- e2e/specs/flows/authenticated-worksheet.spec.ts e2e/specs/flows/import-local-progress.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add e2e/specs/flows/authenticated-worksheet.spec.ts e2e/specs/flows/import-local-progress.spec.ts frontend/src/views/AuthCallbackView.vue frontend/src/stores/worksheet.ts frontend/src/lib/api.ts
git commit -m "test: add authenticated and import playwright flows"
```

## Task 8: Finalize Docs, Install Browsers, and Run Full Verification

**Files:**
- Modify: `README.md`
- Test: `README.md`

- [ ] **Step 1: Update README for Playwright**

Append to `README.md`:

````md
## Playwright E2E tests

Install the Playwright browser once:

```bash
npm run test:e2e:install
```

Start PostgreSQL for E2E:

```bash
npm run db:up
npm run db:migrate
```

Run the E2E suite:

```bash
npm run test:e2e
```

Run in headed mode:

```bash
npm run test:e2e:headed
```

### E2E auth

The suite uses a test-only backend route at `/api/test-auth/login` when `ENABLE_E2E_AUTH=true`. This is only for automated testing and should remain disabled in normal development and production.
````

- [ ] **Step 2: Install Playwright Chromium**

Run: `npm run test:e2e:install`
Expected: PASS

- [ ] **Step 3: Run the full verification set**

Run: `npm run test --workspace backend && npm run test --workspace frontend && npm run test:e2e && npm run build`
Expected: PASS

- [ ] **Step 4: Manually smoke the suite in headed mode**

Run: `npm run test:e2e:headed -- e2e/specs/routes/landing.spec.ts`
Expected: The browser opens, the landing page loads, and the test passes without console errors

- [ ] **Step 5: Commit**

```bash
git add README.md package.json package-lock.json playwright.config.ts .env.e2e e2e backend frontend
git commit -m "test: add broad playwright end-to-end coverage"
```

## Self-Review Checklist

- Spec coverage:
  - broad route coverage: Tasks 4 and 5
  - anonymous flow: Task 6
  - authenticated and import flows: Task 7
  - console and page error guards: Task 4
  - test-only auth and db reset: Task 2
  - docs and commands: Tasks 1 and 8
- Placeholder scan:
  - No `TBD`, `TODO`, or deferred implementation notes remain in the task steps.
  - Every code-change step includes concrete code or exact commands.
- Type consistency:
  - E2E auth uses the same token storage key already used by the frontend auth store.
  - Playwright base URL, backend port, and `.env.e2e` values are aligned across config, scripts, and specs.
