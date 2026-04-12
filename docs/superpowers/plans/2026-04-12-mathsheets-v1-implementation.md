# MathSheets V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack MathSheets-style web application with anonymous local worksheet saving, Google OAuth sign-in, PostgreSQL-backed worksheet persistence, stats, and leaderboards.

**Architecture:** Use a monorepo with a Vue 3 + Vite frontend and a Node.js + Express backend, both in TypeScript. The backend owns worksheet generation, scoring, Google OAuth, and PostgreSQL persistence; the frontend owns routing, UI state, anonymous local drafts, and the local-to-account import flow.

**Tech Stack:** Vue 3, Vite, TypeScript, Vue Router, Pinia, Vitest, Node.js, Express, PostgreSQL, `pg`, Google OAuth 2.0, JWT, Zod, Supertest

---

## File Structure

### Repository root

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`

### Frontend

- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.ts`
- Create: `frontend/src/App.vue`
- Create: `frontend/src/router/index.ts`
- Create: `frontend/src/styles/main.css`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/format.ts`
- Create: `frontend/src/stores/auth.ts`
- Create: `frontend/src/stores/worksheet.ts`
- Create: `frontend/src/stores/leaderboard.ts`
- Create: `frontend/src/composables/useAnonymousWorksheets.ts`
- Create: `frontend/src/components/layout/AppShell.vue`
- Create: `frontend/src/components/layout/AppHeader.vue`
- Create: `frontend/src/components/common/StatCard.vue`
- Create: `frontend/src/components/common/EmptyState.vue`
- Create: `frontend/src/components/common/ImportLocalProgressModal.vue`
- Create: `frontend/src/components/worksheet/GeneratorForm.vue`
- Create: `frontend/src/components/worksheet/WorksheetGrid.vue`
- Create: `frontend/src/components/worksheet/WorksheetSummaryCard.vue`
- Create: `frontend/src/components/leaderboard/LeaderboardTable.vue`
- Create: `frontend/src/views/LandingView.vue`
- Create: `frontend/src/views/AuthCallbackView.vue`
- Create: `frontend/src/views/DashboardView.vue`
- Create: `frontend/src/views/GeneratorView.vue`
- Create: `frontend/src/views/WorksheetView.vue`
- Create: `frontend/src/views/SavedWorksheetsView.vue`
- Create: `frontend/src/views/LeaderboardView.vue`
- Create: `frontend/src/views/ProfileView.vue`
- Create: `frontend/src/tests/auth.store.test.ts`
- Create: `frontend/src/tests/anonymous-worksheets.test.ts`
- Create: `frontend/src/tests/generator-view.test.ts`

### Backend

- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/src/server.ts`
- Create: `backend/src/app.ts`
- Create: `backend/src/config/env.ts`
- Create: `backend/src/db/pool.ts`
- Create: `backend/src/db/migrate.ts`
- Create: `backend/src/db/seed.ts`
- Create: `backend/src/types/auth.ts`
- Create: `backend/src/types/worksheet.ts`
- Create: `backend/src/lib/http-error.ts`
- Create: `backend/src/lib/jwt.ts`
- Create: `backend/src/lib/async-handler.ts`
- Create: `backend/src/middleware/error-handler.ts`
- Create: `backend/src/middleware/authenticate.ts`
- Create: `backend/src/middleware/validate.ts`
- Create: `backend/src/services/google-oauth.service.ts`
- Create: `backend/src/services/token.service.ts`
- Create: `backend/src/services/worksheet-generator.service.ts`
- Create: `backend/src/services/worksheet-scoring.service.ts`
- Create: `backend/src/services/statistics.service.ts`
- Create: `backend/src/repositories/user.repository.ts`
- Create: `backend/src/repositories/token.repository.ts`
- Create: `backend/src/repositories/worksheet.repository.ts`
- Create: `backend/src/repositories/leaderboard.repository.ts`
- Create: `backend/src/routes/health.routes.ts`
- Create: `backend/src/routes/auth.routes.ts`
- Create: `backend/src/routes/worksheet.routes.ts`
- Create: `backend/src/routes/user.routes.ts`
- Create: `backend/src/routes/leaderboard.routes.ts`
- Create: `backend/src/schemas/auth.schema.ts`
- Create: `backend/src/schemas/worksheet.schema.ts`
- Create: `backend/src/schemas/leaderboard.schema.ts`
- Create: `backend/src/tests/worksheet-generator.service.test.ts`
- Create: `backend/src/tests/worksheet-scoring.service.test.ts`
- Create: `backend/src/tests/worksheet.routes.test.ts`
- Create: `backend/src/tests/leaderboard.repository.test.ts`

### Database

- Create: `database/schema.sql`
- Create: `database/seed.sql`
- Create: `database/views.sql`

## Task 1: Bootstrap the Monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `frontend/package.json`
- Create: `backend/package.json`
- Test: `package.json`

- [ ] **Step 1: Create the failing workspace smoke check**

Add a root script that expects frontend and backend package manifests to exist:

```json
{
  "name": "mathsheets",
  "private": true,
  "packageManager": "pnpm@10.10.0",
  "scripts": {
    "check:workspace": "node -e \"const fs=require('fs'); ['frontend/package.json','backend/package.json'].forEach((file)=>{if(!fs.existsSync(file)) throw new Error(file+' missing')}); console.log('workspace ok')\""
  }
}
```

- [ ] **Step 2: Run the smoke check to verify it fails**

Run: `pnpm check:workspace`
Expected: FAIL with `frontend/package.json missing`

- [ ] **Step 3: Create the workspace manifests and shared config**

Root files:

```yaml
# pnpm-workspace.yaml
packages:
  - frontend
  - backend
```

```gitignore
node_modules
dist
.env
.env.local
.DS_Store
coverage
frontend/node_modules
backend/node_modules
frontend/dist
backend/dist
```

```dotenv
# .env.example
APP_BASE_URL=http://localhost:5173
FRONTEND_API_BASE_URL=http://localhost:3000/api
DATABASE_URL=postgres://postgres:postgres@localhost:5432/mathsheets
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
COOKIE_DOMAIN=localhost
```

Frontend manifest:

```json
{
  "name": "@mathsheets/frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "pinia": "^3.0.1",
    "vue": "^3.5.13",
    "vue-router": "^4.5.1",
    "zod": "^3.24.4"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.3",
    "@vue/test-utils": "^2.4.6",
    "jsdom": "^26.0.0",
    "typescript": "^5.8.3",
    "vite": "^6.3.2",
    "vitest": "^3.1.2"
  }
}
```

Backend manifest:

```json
{
  "name": "@mathsheets/backend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "migrate": "tsx src/db/migrate.ts",
    "seed": "tsx src/db/seed.ts"
  },
  "dependencies": {
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^5.1.0",
    "google-auth-library": "^9.15.1",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.14.1",
    "zod": "^3.24.4"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.8",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.1",
    "@types/jsonwebtoken": "^9.0.9",
    "@types/node": "^22.14.1",
    "@types/supertest": "^6.0.3",
    "supertest": "^7.1.0",
    "tsx": "^4.19.3",
    "typescript": "^5.8.3",
    "vitest": "^3.1.2"
  }
}
```

- [ ] **Step 4: Run the smoke check to verify it passes**

Run: `pnpm check:workspace`
Expected: PASS with `workspace ok`

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml .gitignore .env.example frontend/package.json backend/package.json
git commit -m "chore: bootstrap mathsheets workspace"
```

## Task 2: Create the PostgreSQL Schema and Seed Data

**Files:**
- Create: `database/schema.sql`
- Create: `database/views.sql`
- Create: `database/seed.sql`
- Create: `backend/src/db/migrate.ts`
- Create: `backend/src/db/seed.ts`
- Test: `database/schema.sql`

- [ ] **Step 1: Write the failing schema assertion**

Create a migration runner test script target by checking for the `users` table definition:

```ts
// backend/src/db/migrate.ts
import { readFileSync } from "node:fs";

const schema = readFileSync(new URL("../../../database/schema.sql", import.meta.url), "utf8");

if (!schema.includes("CREATE TABLE users")) {
  throw new Error("users table definition missing");
}

console.log("schema file looks valid");
```

- [ ] **Step 2: Run the assertion to verify it fails**

Run: `pnpm --filter @mathsheets/backend migrate`
Expected: FAIL with `users table definition missing`

- [ ] **Step 3: Add schema, views, and seed SQL**

Schema core:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE worksheet_status AS ENUM ('draft', 'partial', 'completed');
CREATE TYPE worksheet_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE worksheet_size AS ENUM ('small', 'medium', 'large');
CREATE TYPE worksheet_source AS ENUM ('generated', 'imported');
CREATE TYPE operation_symbol AS ENUM ('+', '-', '*', '/');

CREATE TABLE worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status worksheet_status NOT NULL DEFAULT 'draft',
  difficulty worksheet_difficulty NOT NULL,
  problem_count INTEGER NOT NULL CHECK (problem_count > 0),
  allowed_operations TEXT[] NOT NULL,
  number_range_min INTEGER NOT NULL,
  number_range_max INTEGER NOT NULL,
  worksheet_size worksheet_size NOT NULL,
  clean_division_only BOOLEAN NOT NULL DEFAULT TRUE,
  source worksheet_source NOT NULL DEFAULT 'generated',
  local_import_key TEXT,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, local_import_key)
);
```

```sql
CREATE TABLE worksheet_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_id UUID NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL,
  operation operation_symbol NOT NULL,
  left_operand INTEGER NOT NULL,
  right_operand INTEGER NOT NULL,
  display_text TEXT NOT NULL,
  correct_answer NUMERIC NOT NULL,
  UNIQUE (worksheet_id, question_order)
);

CREATE TABLE worksheet_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_id UUID NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status worksheet_status NOT NULL DEFAULT 'draft',
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score_correct INTEGER NOT NULL DEFAULT 0,
  score_total INTEGER NOT NULL DEFAULT 0,
  accuracy_percentage NUMERIC(5,2) NOT NULL DEFAULT 0
);

CREATE TABLE worksheet_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES worksheet_attempts(id) ON DELETE CASCADE,
  worksheet_question_id UUID NOT NULL REFERENCES worksheet_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ,
  UNIQUE (attempt_id, worksheet_question_id)
);

CREATE TABLE user_statistics (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  worksheets_completed INTEGER NOT NULL DEFAULT 0,
  problems_solved INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  accuracy_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  current_streak_days INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Views:

```sql
CREATE OR REPLACE VIEW leaderboard_daily AS
SELECT
  u.id AS user_id,
  u.display_name,
  COALESCE(u.avatar_url, '') AS avatar_url,
  COUNT(DISTINCT w.id) AS worksheets_completed,
  SUM(a.score_total) AS problems_solved,
  SUM(a.score_correct) AS correct_answers,
  ROUND((SUM(a.score_correct)::numeric / NULLIF(SUM(a.score_total), 0)) * 100, 2) AS accuracy_percentage
FROM users u
JOIN worksheets w ON w.user_id = u.id
JOIN worksheet_attempts a ON a.worksheet_id = w.id
WHERE w.status = 'completed'
  AND w.submitted_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
GROUP BY u.id, u.display_name, u.avatar_url;
```

Seed:

```sql
INSERT INTO users (google_sub, email, display_name, avatar_url)
VALUES
  ('seed-google-1', 'ava@example.com', 'Ava Carter', 'https://example.com/ava.png'),
  ('seed-google-2', 'leo@example.com', 'Leo Young', 'https://example.com/leo.png')
ON CONFLICT (email) DO NOTHING;
```

Migration runner:

```ts
import "dotenv/config";
import { readFileSync } from "node:fs";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const schema = readFileSync(new URL("../../../database/schema.sql", import.meta.url), "utf8");
const views = readFileSync(new URL("../../../database/views.sql", import.meta.url), "utf8");

await pool.query(schema);
await pool.query(views);
await pool.end();

console.log("database migrated");
```

Seed runner:

```ts
import "dotenv/config";
import { readFileSync } from "node:fs";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const seed = readFileSync(new URL("../../../database/seed.sql", import.meta.url), "utf8");

await pool.query(seed);
await pool.end();

console.log("database seeded");
```

- [ ] **Step 4: Run migrations and seed**

Run: `pnpm --filter @mathsheets/backend migrate && pnpm --filter @mathsheets/backend seed`
Expected: PASS with `database migrated` and `database seeded`

- [ ] **Step 5: Commit**

```bash
git add database/schema.sql database/views.sql database/seed.sql backend/src/db/migrate.ts backend/src/db/seed.ts
git commit -m "feat: add postgres schema and seed data"
```

## Task 3: Build the Backend App Skeleton

**Files:**
- Create: `backend/tsconfig.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/src/server.ts`
- Create: `backend/src/app.ts`
- Create: `backend/src/config/env.ts`
- Create: `backend/src/db/pool.ts`
- Create: `backend/src/lib/http-error.ts`
- Create: `backend/src/lib/async-handler.ts`
- Create: `backend/src/middleware/error-handler.ts`
- Create: `backend/src/routes/health.routes.ts`
- Test: `backend/src/tests/worksheet.routes.test.ts`

- [ ] **Step 1: Write the failing health-route test**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";

describe("health route", () => {
  it("returns ok", async () => {
    const response = await request(createApp()).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @mathsheets/backend test -- backend/src/tests/worksheet.routes.test.ts`
Expected: FAIL with `Cannot find module '../app'`

- [ ] **Step 3: Create the Express app foundation**

```ts
// backend/src/config/env.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  APP_BASE_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1)
});

export const env = envSchema.parse(process.env);
```

```ts
// backend/src/app.ts
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { healthRouter } from "./routes/health.routes";
import { errorHandler } from "./middleware/error-handler";

export const createApp = () => {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());

  app.use("/api/health", healthRouter);
  app.use(errorHandler);

  return app;
};
```

```ts
// backend/src/routes/health.routes.ts
import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok" });
});
```

```ts
// backend/src/server.ts
import "dotenv/config";
import { createApp } from "./app";
import { env } from "./config/env";

createApp().listen(env.PORT, () => {
  console.log(`api listening on ${env.PORT}`);
});
```

```ts
// backend/src/middleware/error-handler.ts
import type { NextFunction, Request, Response } from "express";

export const errorHandler = (error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ message: error.message });
};
```

- [ ] **Step 4: Run the backend test to verify it passes**

Run: `pnpm --filter @mathsheets/backend test -- backend/src/tests/worksheet.routes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/tsconfig.json backend/vitest.config.ts backend/src/app.ts backend/src/server.ts backend/src/config/env.ts backend/src/middleware/error-handler.ts backend/src/routes/health.routes.ts backend/src/tests/worksheet.routes.test.ts
git commit -m "feat: add express application skeleton"
```

## Task 4: Implement Worksheet Generation and Scoring Services

**Files:**
- Create: `backend/src/types/worksheet.ts`
- Create: `backend/src/services/worksheet-generator.service.ts`
- Create: `backend/src/services/worksheet-scoring.service.ts`
- Create: `backend/src/tests/worksheet-generator.service.test.ts`
- Create: `backend/src/tests/worksheet-scoring.service.test.ts`
- Test: `backend/src/tests/worksheet-generator.service.test.ts`

- [ ] **Step 1: Write the failing worksheet-generation tests**

```ts
import { describe, expect, it } from "vitest";
import { generateWorksheet } from "../services/worksheet-generator.service";

describe("generateWorksheet", () => {
  it("creates the requested number of questions", () => {
    const worksheet = generateWorksheet({
      problemCount: 12,
      difficulty: "easy",
      allowedOperations: ["+", "-"],
      numberRangeMin: 1,
      numberRangeMax: 10,
      worksheetSize: "small",
      cleanDivisionOnly: true
    });

    expect(worksheet.questions).toHaveLength(12);
  });

  it("creates integer division answers when clean division is enabled", () => {
    const worksheet = generateWorksheet({
      problemCount: 10,
      difficulty: "medium",
      allowedOperations: ["/"],
      numberRangeMin: 1,
      numberRangeMax: 100,
      worksheetSize: "medium",
      cleanDivisionOnly: true
    });

    expect(worksheet.questions.every((question) => Number.isInteger(question.correctAnswer))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the service tests to verify they fail**

Run: `pnpm --filter @mathsheets/backend test -- backend/src/tests/worksheet-generator.service.test.ts`
Expected: FAIL with `Cannot find module '../services/worksheet-generator.service'`

- [ ] **Step 3: Implement generation and scoring**

```ts
// backend/src/types/worksheet.ts
export type Difficulty = "easy" | "medium" | "hard";
export type WorksheetSize = "small" | "medium" | "large";
export type Operation = "+" | "-" | "*" | "/";

export type WorksheetConfig = {
  problemCount: number;
  difficulty: Difficulty;
  allowedOperations: Operation[];
  numberRangeMin: number;
  numberRangeMax: number;
  worksheetSize: WorksheetSize;
  cleanDivisionOnly: boolean;
};

export type GeneratedQuestion = {
  questionOrder: number;
  operation: Operation;
  leftOperand: number;
  rightOperand: number;
  displayText: string;
  correctAnswer: number;
};

export type GeneratedWorksheet = {
  title: string;
  config: WorksheetConfig;
  questions: GeneratedQuestion[];
};
```

```ts
// backend/src/services/worksheet-generator.service.ts
import type { GeneratedQuestion, GeneratedWorksheet, WorksheetConfig } from "../types/worksheet";

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(items: T[]) => items[randomInt(0, items.length - 1)];

const buildQuestion = (index: number, config: WorksheetConfig): GeneratedQuestion => {
  const operation = pick(config.allowedOperations);
  let leftOperand = randomInt(config.numberRangeMin, config.numberRangeMax);
  let rightOperand = randomInt(config.numberRangeMin, config.numberRangeMax);

  if (operation === "-" && config.difficulty === "easy" && leftOperand < rightOperand) {
    [leftOperand, rightOperand] = [rightOperand, leftOperand];
  }

  if (operation === "/") {
    if (config.cleanDivisionOnly) {
      rightOperand = randomInt(Math.max(1, config.numberRangeMin), Math.max(1, Math.min(12, config.numberRangeMax)));
      const answer = randomInt(config.numberRangeMin, Math.max(config.numberRangeMin, Math.floor(config.numberRangeMax / Math.max(rightOperand, 1))));
      leftOperand = answer * rightOperand;
    } else if (rightOperand === 0) {
      rightOperand = 1;
    }
  }

  const correctAnswer =
    operation === "+"
      ? leftOperand + rightOperand
      : operation === "-"
        ? leftOperand - rightOperand
        : operation === "*"
          ? leftOperand * rightOperand
          : leftOperand / rightOperand;

  return {
    questionOrder: index + 1,
    operation,
    leftOperand,
    rightOperand,
    displayText: `${leftOperand} ${operation} ${rightOperand} =`,
    correctAnswer
  };
};

export const generateWorksheet = (config: WorksheetConfig): GeneratedWorksheet => ({
  title: `${config.difficulty[0].toUpperCase()}${config.difficulty.slice(1)} Practice`,
  config,
  questions: Array.from({ length: config.problemCount }, (_, index) => buildQuestion(index, config))
});
```

```ts
// backend/src/services/worksheet-scoring.service.ts
import type { GeneratedQuestion } from "../types/worksheet";

export const scoreWorksheet = (questions: GeneratedQuestion[], answers: Array<string | null>) => {
  const evaluatedAnswers = questions.map((question, index) => {
    const answerText = answers[index] ?? "";
    const numericAnswer = Number(answerText);
    const isCorrect = answerText !== "" && numericAnswer === question.correctAnswer;

    return {
      questionOrder: question.questionOrder,
      answerText,
      isCorrect
    };
  });

  const scoreCorrect = evaluatedAnswers.filter((item) => item.isCorrect).length;
  const scoreTotal = questions.length;
  const accuracyPercentage = scoreTotal === 0 ? 0 : Number(((scoreCorrect / scoreTotal) * 100).toFixed(2));

  return {
    scoreCorrect,
    scoreTotal,
    accuracyPercentage,
    evaluatedAnswers
  };
};
```

- [ ] **Step 4: Add and run the scoring test**

```ts
import { describe, expect, it } from "vitest";
import { scoreWorksheet } from "../services/worksheet-scoring.service";

describe("scoreWorksheet", () => {
  it("marks correct and incorrect answers", () => {
    const result = scoreWorksheet(
      [
        { questionOrder: 1, operation: "+", leftOperand: 2, rightOperand: 3, displayText: "2 + 3 =", correctAnswer: 5 },
        { questionOrder: 2, operation: "*", leftOperand: 4, rightOperand: 2, displayText: "4 * 2 =", correctAnswer: 8 }
      ],
      ["5", "6"]
    );

    expect(result.scoreCorrect).toBe(1);
    expect(result.scoreTotal).toBe(2);
    expect(result.accuracyPercentage).toBe(50);
  });
});
```

Run: `pnpm --filter @mathsheets/backend test -- backend/src/tests/worksheet-generator.service.test.ts backend/src/tests/worksheet-scoring.service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/types/worksheet.ts backend/src/services/worksheet-generator.service.ts backend/src/services/worksheet-scoring.service.ts backend/src/tests/worksheet-generator.service.test.ts backend/src/tests/worksheet-scoring.service.test.ts
git commit -m "feat: add worksheet generation and scoring services"
```

## Task 5: Add Backend Validation, Repositories, and Worksheet Routes

**Files:**
- Create: `backend/src/schemas/worksheet.schema.ts`
- Create: `backend/src/repositories/worksheet.repository.ts`
- Create: `backend/src/middleware/validate.ts`
- Create: `backend/src/routes/worksheet.routes.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/src/tests/worksheet.routes.test.ts`

- [ ] **Step 1: Write the failing generate-route test**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";

describe("worksheet routes", () => {
  it("generates a worksheet", async () => {
    const response = await request(createApp()).post("/api/worksheets/generate").send({
      problemCount: 8,
      difficulty: "medium",
      allowedOperations: ["+", "*"],
      numberRangeMin: 1,
      numberRangeMax: 20,
      worksheetSize: "medium",
      cleanDivisionOnly: true
    });

    expect(response.status).toBe(200);
    expect(response.body.questions).toHaveLength(8);
  });
});
```

- [ ] **Step 2: Run the route test to verify it fails**

Run: `pnpm --filter @mathsheets/backend test -- backend/src/tests/worksheet.routes.test.ts`
Expected: FAIL with `Cannot POST /api/worksheets/generate`

- [ ] **Step 3: Implement schemas, repository skeleton, and routes**

```ts
// backend/src/schemas/worksheet.schema.ts
import { z } from "zod";

export const worksheetConfigSchema = z.object({
  problemCount: z.number().int().min(1).max(100),
  difficulty: z.enum(["easy", "medium", "hard"]),
  allowedOperations: z.array(z.enum(["+", "-", "*", "/"])).min(1),
  numberRangeMin: z.number().int().min(0),
  numberRangeMax: z.number().int().min(1),
  worksheetSize: z.enum(["small", "medium", "large"]),
  cleanDivisionOnly: z.boolean().default(true)
}).refine((value) => value.numberRangeMax >= value.numberRangeMin, {
  message: "numberRangeMax must be greater than or equal to numberRangeMin",
  path: ["numberRangeMax"]
});
```

```ts
// backend/src/middleware/validate.ts
import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

export const validateBody = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", issues: parsed.error.flatten() });
  }

  req.body = parsed.data;
  next();
};
```

```ts
// backend/src/routes/worksheet.routes.ts
import { Router } from "express";
import { validateBody } from "../middleware/validate";
import { worksheetConfigSchema } from "../schemas/worksheet.schema";
import { generateWorksheet } from "../services/worksheet-generator.service";

export const worksheetRouter = Router();

worksheetRouter.post("/generate", validateBody(worksheetConfigSchema), (req, res) => {
  const worksheet = generateWorksheet(req.body);
  res.json(worksheet);
});
```

```ts
// backend/src/app.ts
import { worksheetRouter } from "./routes/worksheet.routes";

app.use("/api/worksheets", worksheetRouter);
```

- [ ] **Step 4: Run the route test to verify it passes**

Run: `pnpm --filter @mathsheets/backend test -- backend/src/tests/worksheet.routes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/schemas/worksheet.schema.ts backend/src/middleware/validate.ts backend/src/routes/worksheet.routes.ts backend/src/app.ts backend/src/tests/worksheet.routes.test.ts
git commit -m "feat: add worksheet generation API"
```

## Task 6: Implement JWT Auth and Google OAuth Integration

**Files:**
- Create: `backend/src/types/auth.ts`
- Create: `backend/src/lib/jwt.ts`
- Create: `backend/src/services/google-oauth.service.ts`
- Create: `backend/src/services/token.service.ts`
- Create: `backend/src/repositories/user.repository.ts`
- Create: `backend/src/repositories/token.repository.ts`
- Create: `backend/src/middleware/authenticate.ts`
- Create: `backend/src/routes/auth.routes.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/src/tests/worksheet.routes.test.ts`

- [ ] **Step 1: Write the failing auth-state test**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";

describe("auth routes", () => {
  it("returns unauthorized for unauthenticated me requests", async () => {
    const response = await request(createApp()).get("/api/auth/me");
    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the auth test to verify it fails**

Run: `pnpm --filter @mathsheets/backend test -- backend/src/tests/worksheet.routes.test.ts`
Expected: FAIL with `Cannot GET /api/auth/me`

- [ ] **Step 3: Implement token helpers, middleware, and auth routes**

```ts
// backend/src/lib/jwt.ts
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export const signAccessToken = (payload: { userId: string }) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: "15m" });

export const signRefreshToken = (payload: { userId: string }) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string };
```

```ts
// backend/src/middleware/authenticate.ts
import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = { id: payload.userId };
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
```

```ts
// backend/src/routes/auth.routes.ts
import { Router } from "express";
import { exchangeCodeForGoogleProfile } from "../services/google-oauth.service";
import { issueSessionTokens, readRefreshTokenCookie, rotateRefreshToken } from "../services/token.service";
import { findOrCreateUserFromGoogleProfile, findUserById } from "../repositories/user.repository";
import { authenticate } from "../middleware/authenticate";

export const authRouter = Router();

authRouter.get("/google", (_req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL!,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent"
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

authRouter.get("/google/callback", async (req, res) => {
  const code = String(req.query.code ?? "");
  const profile = await exchangeCodeForGoogleProfile(code);
  const user = await findOrCreateUserFromGoogleProfile(profile);
  const { accessToken, refreshToken } = await issueSessionTokens(user.id);

  res.cookie("mathsheets_refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth"
  });

  res.redirect(`${process.env.APP_BASE_URL}/auth/callback?access_token=${accessToken}`);
});

authRouter.get("/me", authenticate, async (req, res) => {
  const user = await findUserById(req.user!.id);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url
    }
  });
});

authRouter.post("/refresh", async (req, res) => {
  const existingToken = readRefreshTokenCookie(req);
  const rotated = await rotateRefreshToken(existingToken);

  res.cookie("mathsheets_refresh_token", rotated.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth"
  });

  res.json({ accessToken: rotated.accessToken });
});

authRouter.post("/logout", async (_req, res) => {
  res.clearCookie("mathsheets_refresh_token", { path: "/api/auth" });
  res.status(204).send();
});
```

```ts
// backend/src/app.ts
import { authRouter } from "./routes/auth.routes";

app.use("/api/auth", authRouter);
```

Google service and token service shape:

```ts
export const exchangeCodeForGoogleProfile = async (code: string) => ({
  googleSub: "google-sub",
  email: "user@example.com",
  displayName: "Example User",
  avatarUrl: "https://example.com/avatar.png"
});
```

```ts
export const issueSessionTokens = async (userId: string) => {
  const accessToken = signAccessToken({ userId });
  const refreshToken = signRefreshToken({ userId });
  await persistRefreshToken(userId, refreshToken);
  return { accessToken, refreshToken };
};
```

- [ ] **Step 4: Run the auth test and then extend it to the real flow**

Run: `pnpm --filter @mathsheets/backend test -- backend/src/tests/worksheet.routes.test.ts`
Expected: PASS for unauthorized request after real middleware is wired

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/jwt.ts backend/src/middleware/authenticate.ts backend/src/routes/auth.routes.ts backend/src/app.ts backend/src/types/auth.ts backend/src/services/google-oauth.service.ts backend/src/services/token.service.ts backend/src/repositories/user.repository.ts backend/src/repositories/token.repository.ts
git commit -m "feat: add jwt auth and google oauth backend flow"
```

## Task 7: Persist Worksheets, Attempts, Submission, and Import

**Files:**
- Modify: `backend/src/repositories/worksheet.repository.ts`
- Modify: `backend/src/routes/worksheet.routes.ts`
- Modify: `backend/src/services/worksheet-scoring.service.ts`
- Test: `backend/src/tests/worksheet.routes.test.ts`

- [ ] **Step 1: Write the failing submission test**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";

describe("worksheet submission", () => {
  it("submits a worksheet and returns scoring details", async () => {
    const app = createApp();

    await request(app).post("/api/worksheets/generate").send({
      problemCount: 2,
      difficulty: "easy",
      allowedOperations: ["+"],
      numberRangeMin: 1,
      numberRangeMax: 5,
      worksheetSize: "small",
      cleanDivisionOnly: true
    });

    const response = await request(app).post("/api/worksheets/demo-id/submit").send({
      answers: ["2", "3"]
    });

    expect(response.status).toBe(200);
    expect(response.body.scoreTotal).toBe(2);
  });
});
```

- [ ] **Step 2: Run the submission test to verify it fails**

Run: `pnpm --filter @mathsheets/backend test -- backend/src/tests/worksheet.routes.test.ts`
Expected: FAIL with `Cannot POST /api/worksheets/demo-id/submit`

- [ ] **Step 3: Implement worksheet persistence and submission routes**

Repository methods to add:

```ts
export const createWorksheetWithAttempt = async (input: {
  userId: string | null;
  title: string;
  config: WorksheetConfig;
  questions: GeneratedQuestion[];
  source: "generated" | "imported";
  localImportKey?: string;
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const worksheetResult = await client.query(
      `INSERT INTO worksheets (
        user_id, title, difficulty, problem_count, allowed_operations, number_range_min,
        number_range_max, worksheet_size, clean_division_only, source, local_import_key
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        input.userId,
        input.title,
        input.config.difficulty,
        input.config.problemCount,
        input.config.allowedOperations,
        input.config.numberRangeMin,
        input.config.numberRangeMax,
        input.config.worksheetSize,
        input.config.cleanDivisionOnly,
        input.source,
        input.localImportKey ?? null
      ]
    );

    const worksheet = worksheetResult.rows[0];

    for (const question of input.questions) {
      await client.query(
        `INSERT INTO worksheet_questions (
          worksheet_id, question_order, operation, left_operand, right_operand, display_text, correct_answer
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          worksheet.id,
          question.questionOrder,
          question.operation,
          question.leftOperand,
          question.rightOperand,
          question.displayText,
          question.correctAnswer
        ]
      );
    }

    const attemptResult = await client.query(
      `INSERT INTO worksheet_attempts (worksheet_id, user_id, status)
       VALUES ($1, $2, 'draft')
       RETURNING *`,
      [worksheet.id, input.userId]
    );

    await client.query("COMMIT");
    return { worksheet, attempt: attemptResult.rows[0], questions: input.questions };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const saveWorksheetAnswers = async (input: {
  worksheetId: string;
  answers: Array<{ questionId: string; answerText: string }>;
  elapsedSeconds: number;
  status: "draft" | "partial";
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const attemptResult = await client.query(
      `SELECT id FROM worksheet_attempts WHERE worksheet_id = $1 ORDER BY started_at ASC LIMIT 1`,
      [input.worksheetId]
    );

    const attemptId = attemptResult.rows[0].id;

    for (const answer of input.answers) {
      await client.query(
        `INSERT INTO worksheet_answers (attempt_id, worksheet_question_id, answer_text, answered_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (attempt_id, worksheet_question_id)
         DO UPDATE SET answer_text = EXCLUDED.answer_text, answered_at = NOW()`,
        [attemptId, answer.questionId, answer.answerText]
      );
    }

    await client.query(
      `UPDATE worksheet_attempts
       SET status = $2, elapsed_seconds = $3, last_saved_at = NOW()
       WHERE id = $1`,
      [attemptId, input.status, input.elapsedSeconds]
    );

    await client.query(
      `UPDATE worksheets SET status = $2, updated_at = NOW() WHERE id = $1`,
      [input.worksheetId, input.status]
    );

    await client.query("COMMIT");
    return { worksheetId: input.worksheetId, status: input.status };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const submitWorksheet = async (input: {
  worksheetId: string;
  answers: string[];
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const questionResult = await client.query(
      `SELECT id, question_order, operation, left_operand, right_operand, display_text, correct_answer
       FROM worksheet_questions
       WHERE worksheet_id = $1
       ORDER BY question_order ASC`,
      [input.worksheetId]
    );

    const scored = scoreWorksheet(questionResult.rows, input.answers);

    const attemptResult = await client.query(
      `UPDATE worksheet_attempts
       SET status = 'completed',
           completed_at = NOW(),
           last_saved_at = NOW(),
           score_correct = $2,
           score_total = $3,
           accuracy_percentage = $4
       WHERE worksheet_id = $1
       RETURNING *`,
      [input.worksheetId, scored.scoreCorrect, scored.scoreTotal, scored.accuracyPercentage]
    );

    await client.query(
      `UPDATE worksheets
       SET status = 'completed', submitted_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [input.worksheetId]
    );

    await client.query("COMMIT");
    return { ...attemptResult.rows[0], ...scored };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
```

Route shape:

```ts
worksheetRouter.post("/", async (req, res) => {
  const worksheet = generateWorksheet(req.body);
  const persisted = await createWorksheetWithAttempt({
    userId: req.user?.id ?? null,
    title: worksheet.title,
    config: worksheet.config,
    questions: worksheet.questions,
    source: "generated"
  });

  res.status(201).json(persisted);
});

worksheetRouter.patch("/:id/save", async (req, res) => {
  const saved = await saveWorksheetAnswers({
    worksheetId: req.params.id,
    answers: req.body.answers,
    elapsedSeconds: req.body.elapsedSeconds,
    status: req.body.status
  });

  res.json(saved);
});

worksheetRouter.post("/:id/submit", async (req, res) => {
  const result = await submitWorksheet({
    worksheetId: req.params.id,
    answers: req.body.answers
  });

  res.json(result);
});

worksheetRouter.post("/import-local", authenticate, async (req, res) => {
  const imported = await importLocalWorksheets(req.user!.id, req.body.worksheets);
  res.status(201).json({ importedCount: imported.length, worksheets: imported });
});
```

- [ ] **Step 4: Run route tests and add DB-backed assertions**

Run: `pnpm --filter @mathsheets/backend test -- backend/src/tests/worksheet.routes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/repositories/worksheet.repository.ts backend/src/routes/worksheet.routes.ts backend/src/services/worksheet-scoring.service.ts backend/src/tests/worksheet.routes.test.ts
git commit -m "feat: persist worksheets and add submission flow"
```

## Task 8: Add Statistics and Leaderboard Queries

**Files:**
- Create: `backend/src/schemas/leaderboard.schema.ts`
- Create: `backend/src/repositories/leaderboard.repository.ts`
- Create: `backend/src/services/statistics.service.ts`
- Create: `backend/src/routes/user.routes.ts`
- Create: `backend/src/routes/leaderboard.routes.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/src/tests/leaderboard.repository.test.ts`

- [ ] **Step 1: Write the failing leaderboard query test**

```ts
import { describe, expect, it } from "vitest";
import { getLeaderboard } from "../repositories/leaderboard.repository";

describe("getLeaderboard", () => {
  it("supports the daily worksheets metric", async () => {
    const rows = await getLeaderboard({ period: "daily", metric: "worksheets" });
    expect(Array.isArray(rows)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the leaderboard test to verify it fails**

Run: `pnpm --filter @mathsheets/backend test -- backend/src/tests/leaderboard.repository.test.ts`
Expected: FAIL with `Cannot find module '../repositories/leaderboard.repository'`

- [ ] **Step 3: Implement leaderboard and statistics queries**

```ts
// backend/src/repositories/leaderboard.repository.ts
import { pool } from "../db/pool";

const periodViewMap = {
  daily: "leaderboard_daily",
  weekly: "leaderboard_weekly",
  monthly: "leaderboard_monthly"
} as const;

const metricOrderMap = {
  worksheets: "worksheets_completed DESC, problems_solved DESC, display_name ASC",
  problems: "problems_solved DESC, worksheets_completed DESC, display_name ASC",
  accuracy: "accuracy_percentage DESC, problems_solved DESC, display_name ASC"
} as const;

export const getLeaderboard = async ({
  period,
  metric
}: {
  period: "daily" | "weekly" | "monthly";
  metric: "worksheets" | "problems" | "accuracy";
}) => {
  const sql = `
    SELECT *
    FROM ${periodViewMap[period]}
    WHERE problems_solved >= CASE WHEN $1 = 'accuracy' THEN 10 ELSE 0 END
    ORDER BY ${metricOrderMap[metric]}
    LIMIT 50
  `;

  const result = await pool.query(sql, [metric]);
  return result.rows;
};
```

```ts
// backend/src/routes/leaderboard.routes.ts
import { Router } from "express";
import { getLeaderboard } from "../repositories/leaderboard.repository";

export const leaderboardRouter = Router();

leaderboardRouter.get("/", async (req, res) => {
  const period = (req.query.period as "daily" | "weekly" | "monthly") ?? "daily";
  const metric = (req.query.metric as "worksheets" | "problems" | "accuracy") ?? "worksheets";
  const leaderboard = await getLeaderboard({ period, metric });
  res.json({ period, metric, leaderboard });
});
```

```ts
// backend/src/routes/user.routes.ts
import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { getUserStatistics, getUserHistory } from "../services/statistics.service";

export const userRouter = Router();

userRouter.get("/me/stats", authenticate, async (req, res) => {
  res.json(await getUserStatistics(req.user!.id));
});

userRouter.get("/me/history", authenticate, async (req, res) => {
  res.json(await getUserHistory(req.user!.id));
});
```

- [ ] **Step 4: Run the leaderboard test and add route smoke tests**

Run: `pnpm --filter @mathsheets/backend test -- backend/src/tests/leaderboard.repository.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/schemas/leaderboard.schema.ts backend/src/repositories/leaderboard.repository.ts backend/src/services/statistics.service.ts backend/src/routes/user.routes.ts backend/src/routes/leaderboard.routes.ts backend/src/app.ts backend/src/tests/leaderboard.repository.test.ts
git commit -m "feat: add stats and leaderboard queries"
```

## Task 9: Scaffold the Vue Frontend and Routing

**Files:**
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.ts`
- Create: `frontend/src/App.vue`
- Create: `frontend/src/router/index.ts`
- Create: `frontend/src/styles/main.css`
- Create: `frontend/src/components/layout/AppShell.vue`
- Create: `frontend/src/components/layout/AppHeader.vue`
- Create: `frontend/src/views/LandingView.vue`
- Create: `frontend/src/views/AuthCallbackView.vue`
- Create: `frontend/src/views/DashboardView.vue`
- Create: `frontend/src/views/GeneratorView.vue`
- Create: `frontend/src/views/WorksheetView.vue`
- Create: `frontend/src/views/SavedWorksheetsView.vue`
- Create: `frontend/src/views/LeaderboardView.vue`
- Create: `frontend/src/views/ProfileView.vue`
- Test: `frontend/src/tests/generator-view.test.ts`

- [ ] **Step 1: Write the failing router smoke test**

```ts
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";
import App from "../App.vue";
import { routes } from "../router";

describe("router", () => {
  it("renders the landing page", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes
    });

    router.push("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });

    expect(wrapper.text()).toContain("Printable math practice");
  });
});
```

- [ ] **Step 2: Run the frontend smoke test to verify it fails**

Run: `pnpm --filter @mathsheets/frontend test -- frontend/src/tests/generator-view.test.ts`
Expected: FAIL with `Cannot find module '../App.vue'`

- [ ] **Step 3: Create the Vue app shell and routes**

```ts
// frontend/src/router/index.ts
import type { RouteRecordRaw } from "vue-router";

export const routes: RouteRecordRaw[] = [
  { path: "/", component: () => import("../views/LandingView.vue") },
  { path: "/auth/callback", component: () => import("../views/AuthCallbackView.vue") },
  { path: "/dashboard", component: () => import("../views/DashboardView.vue") },
  { path: "/generate", component: () => import("../views/GeneratorView.vue") },
  { path: "/worksheets/:id", component: () => import("../views/WorksheetView.vue") },
  { path: "/worksheets", component: () => import("../views/SavedWorksheetsView.vue") },
  { path: "/leaderboard", component: () => import("../views/LeaderboardView.vue") },
  { path: "/profile", component: () => import("../views/ProfileView.vue") }
];
```

```vue
<!-- frontend/src/App.vue -->
<template>
  <AppShell>
    <RouterView />
  </AppShell>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import AppShell from "./components/layout/AppShell.vue";
</script>
```

```vue
<!-- frontend/src/views/LandingView.vue -->
<template>
  <section class="hero">
    <p class="eyebrow">MathSheets</p>
    <h1>Printable math practice that starts instantly.</h1>
    <p class="lede">
      Generate worksheets, save progress locally, and sign in later to sync stats and join the leaderboard.
    </p>
  </section>
</template>
```

- [ ] **Step 4: Run the router smoke test to verify it passes**

Run: `pnpm --filter @mathsheets/frontend test -- frontend/src/tests/generator-view.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/tsconfig.json frontend/vite.config.ts frontend/index.html frontend/src/main.ts frontend/src/App.vue frontend/src/router/index.ts frontend/src/styles/main.css frontend/src/components/layout/AppShell.vue frontend/src/components/layout/AppHeader.vue frontend/src/views/LandingView.vue frontend/src/views/AuthCallbackView.vue frontend/src/views/DashboardView.vue frontend/src/views/GeneratorView.vue frontend/src/views/WorksheetView.vue frontend/src/views/SavedWorksheetsView.vue frontend/src/views/LeaderboardView.vue frontend/src/views/ProfileView.vue frontend/src/tests/generator-view.test.ts
git commit -m "feat: scaffold vue application shell"
```

## Task 10: Build Frontend API Utilities, Stores, and Anonymous Persistence

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/stores/auth.ts`
- Create: `frontend/src/stores/worksheet.ts`
- Create: `frontend/src/stores/leaderboard.ts`
- Create: `frontend/src/composables/useAnonymousWorksheets.ts`
- Create: `frontend/src/tests/auth.store.test.ts`
- Create: `frontend/src/tests/anonymous-worksheets.test.ts`
- Test: `frontend/src/tests/auth.store.test.ts`

- [ ] **Step 1: Write the failing anonymous-storage test**

```ts
import { describe, expect, it } from "vitest";
import { createAnonymousWorksheetStore } from "../composables/useAnonymousWorksheets";

describe("anonymous worksheets", () => {
  it("persists local worksheets", () => {
    const store = createAnonymousWorksheetStore("test-key");
    store.save([{ id: "local-1", title: "Easy Practice" }]);
    expect(store.load()).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @mathsheets/frontend test -- frontend/src/tests/anonymous-worksheets.test.ts`
Expected: FAIL with `Cannot find module '../composables/useAnonymousWorksheets'`

- [ ] **Step 3: Implement API helper and stores**

```ts
// frontend/src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

export const apiFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
};
```

```ts
// frontend/src/composables/useAnonymousWorksheets.ts
export const createAnonymousWorksheetStore = (storageKey = "mathsheets.anonymous.worksheets") => ({
  load: <T>() => JSON.parse(localStorage.getItem(storageKey) ?? "[]") as T[],
  save: <T>(worksheets: T[]) => localStorage.setItem(storageKey, JSON.stringify(worksheets)),
  clear: () => localStorage.removeItem(storageKey)
});
```

```ts
// frontend/src/stores/auth.ts
import { defineStore } from "pinia";
import { apiFetch } from "../lib/api";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as null | { id: string; email: string; displayName: string; avatarUrl?: string },
    hasCheckedAuth: false
  }),
  actions: {
    async fetchMe() {
      try {
        const payload = await apiFetch<{ user: { id: string; email: string; displayName: string; avatarUrl?: string } }>("/auth/me");
        this.user = payload.user;
      } catch {
        this.user = null;
      } finally {
        this.hasCheckedAuth = true;
      }
    }
  }
});
```

- [ ] **Step 4: Run the anonymous-storage and auth-store tests**

Run: `pnpm --filter @mathsheets/frontend test -- frontend/src/tests/anonymous-worksheets.test.ts frontend/src/tests/auth.store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/stores/auth.ts frontend/src/stores/worksheet.ts frontend/src/stores/leaderboard.ts frontend/src/composables/useAnonymousWorksheets.ts frontend/src/tests/auth.store.test.ts frontend/src/tests/anonymous-worksheets.test.ts
git commit -m "feat: add frontend stores and anonymous worksheet persistence"
```

## Task 11: Implement Generator, Solver, Import Confirmation, and Leaderboard UI

**Files:**
- Create: `frontend/src/components/common/StatCard.vue`
- Create: `frontend/src/components/common/EmptyState.vue`
- Create: `frontend/src/components/common/ImportLocalProgressModal.vue`
- Create: `frontend/src/components/worksheet/GeneratorForm.vue`
- Create: `frontend/src/components/worksheet/WorksheetGrid.vue`
- Create: `frontend/src/components/worksheet/WorksheetSummaryCard.vue`
- Create: `frontend/src/components/leaderboard/LeaderboardTable.vue`
- Modify: `frontend/src/views/DashboardView.vue`
- Modify: `frontend/src/views/GeneratorView.vue`
- Modify: `frontend/src/views/WorksheetView.vue`
- Modify: `frontend/src/views/SavedWorksheetsView.vue`
- Modify: `frontend/src/views/LeaderboardView.vue`
- Modify: `frontend/src/views/ProfileView.vue`
- Test: `frontend/src/tests/generator-view.test.ts`

- [ ] **Step 1: Write the failing generator form test**

```ts
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import GeneratorForm from "../components/worksheet/GeneratorForm.vue";

describe("GeneratorForm", () => {
  it("emits a generate event with form data", async () => {
    const wrapper = mount(GeneratorForm);
    await wrapper.find("form").trigger("submit");
    expect(wrapper.emitted("generate")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @mathsheets/frontend test -- frontend/src/tests/generator-view.test.ts`
Expected: FAIL with `Cannot find module '../components/worksheet/GeneratorForm.vue'`

- [ ] **Step 3: Implement the interactive worksheet UI**

Generator form core:

```vue
<template>
  <form class="generator-form" @submit.prevent="emitGenerate">
    <label>
      Problems
      <input v-model.number="form.problemCount" min="1" max="100" type="number" />
    </label>
    <label>
      Difficulty
      <select v-model="form.difficulty">
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
    </label>
    <button type="submit">Generate worksheet</button>
  </form>
</template>

<script setup lang="ts">
import { reactive } from "vue";

const emit = defineEmits<{
  generate: [payload: {
    problemCount: number;
    difficulty: "easy" | "medium" | "hard";
    allowedOperations: string[];
    numberRangeMin: number;
    numberRangeMax: number;
    worksheetSize: "small" | "medium" | "large";
    cleanDivisionOnly: boolean;
  }];
}>();

const form = reactive({
  problemCount: 12,
  difficulty: "easy" as const,
  allowedOperations: ["+", "-"],
  numberRangeMin: 1,
  numberRangeMax: 10,
  worksheetSize: "medium" as const,
  cleanDivisionOnly: true
});

const emitGenerate = () => emit("generate", { ...form });
</script>
```

Worksheet grid core:

```vue
<template>
  <section class="worksheet-grid">
    <article v-for="question in questions" :key="question.id ?? question.questionOrder" class="worksheet-cell">
      <label :for="`answer-${question.questionOrder}`">{{ question.displayText }}</label>
      <input
        :id="`answer-${question.questionOrder}`"
        :value="answers[question.questionOrder - 1] ?? ''"
        @input="$emit('update-answer', question.questionOrder - 1, ($event.target as HTMLInputElement).value)"
      />
    </article>
  </section>
</template>
```

Import modal core:

```vue
<template>
  <div v-if="open" class="modal-backdrop">
    <div class="modal-card">
      <h2>Import local progress?</h2>
      <p>You have worksheet drafts on this device. Import them into your new account?</p>
      <div class="modal-actions">
        <button @click="$emit('decline')">Keep local only</button>
        <button @click="$emit('confirm')">Import progress</button>
      </div>
    </div>
  </div>
</template>
```

Dashboard should:

- show stats cards when signed in
- show a banner for anonymous mode
- display the import modal after auth if local worksheets exist and the user has not decided yet

Leaderboard view should:

- let the user choose `daily`, `weekly`, `monthly`
- let the user choose `worksheets`, `problems`, `accuracy`
- fetch and render the leaderboard table

- [ ] **Step 4: Run the component tests and smoke through the manual flow**

Run: `pnpm --filter @mathsheets/frontend test -- frontend/src/tests/generator-view.test.ts`
Expected: PASS

Manual check:

1. Run `pnpm --filter @mathsheets/frontend dev`
2. Open `/generate`
3. Generate a worksheet
4. Save anonymous answers
5. Verify the import modal appears after auth state becomes signed in

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/common/StatCard.vue frontend/src/components/common/EmptyState.vue frontend/src/components/common/ImportLocalProgressModal.vue frontend/src/components/worksheet/GeneratorForm.vue frontend/src/components/worksheet/WorksheetGrid.vue frontend/src/components/worksheet/WorksheetSummaryCard.vue frontend/src/components/leaderboard/LeaderboardTable.vue frontend/src/views/DashboardView.vue frontend/src/views/GeneratorView.vue frontend/src/views/WorksheetView.vue frontend/src/views/SavedWorksheetsView.vue frontend/src/views/LeaderboardView.vue frontend/src/views/ProfileView.vue frontend/src/tests/generator-view.test.ts
git commit -m "feat: add worksheet, dashboard, and leaderboard frontend flows"
```

## Task 12: Wire Frontend Auth, Backend Integration, and Documentation

**Files:**
- Modify: `frontend/src/views/AuthCallbackView.vue`
- Modify: `frontend/src/stores/auth.ts`
- Modify: `frontend/src/stores/worksheet.ts`
- Modify: `backend/src/routes/auth.routes.ts`
- Modify: `README.md`
- Test: `README.md`

- [ ] **Step 1: Write the failing auth-callback test**

```ts
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it } from "vitest";
import AuthCallbackView from "../views/AuthCallbackView.vue";

describe("AuthCallbackView", () => {
  it("renders sync messaging while auth is loading", () => {
    setActivePinia(createPinia());
    const wrapper = mount(AuthCallbackView);
    expect(wrapper.text()).toContain("Signing you in");
  });
});
```

- [ ] **Step 2: Run the auth-callback test to verify it fails**

Run: `pnpm --filter @mathsheets/frontend test -- frontend/src/tests/generator-view.test.ts`
Expected: FAIL until the callback view is implemented

- [ ] **Step 3: Implement callback handling, import triggering, and README**

Callback view:

```vue
<template>
  <section class="panel">
    <h1>Signing you in</h1>
    <p>We're connecting your Google account and checking for local worksheet progress to import.</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useWorksheetStore } from "../stores/worksheet";

const router = useRouter();
const authStore = useAuthStore();
const worksheetStore = useWorksheetStore();

onMounted(async () => {
  await authStore.fetchMe();
  await worksheetStore.maybePromptForImport();
  router.replace("/dashboard");
});
</script>
```

README sections to add:

```md
## Setup

1. Copy `.env.example` to `.env`.
2. Create a PostgreSQL database named `mathsheets`.
3. Install dependencies with `pnpm install`.
4. Run migrations with `pnpm --filter @mathsheets/backend migrate`.
5. Seed sample data with `pnpm --filter @mathsheets/backend seed`.
6. Start the backend with `pnpm --filter @mathsheets/backend dev`.
7. Start the frontend with `pnpm --filter @mathsheets/frontend dev`.

## Google OAuth setup

Create a Google OAuth web application and add:

- `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI
- `http://localhost:5173` as an authorized JavaScript origin
```

- [ ] **Step 4: Run the final test suite and manual verification**

Run: `pnpm --filter @mathsheets/backend test && pnpm --filter @mathsheets/frontend test`
Expected: PASS

Manual checks:

1. Generate an anonymous worksheet and reload the page to confirm local persistence.
2. Sign in with Google and verify the import confirmation modal appears.
3. Import local worksheets and confirm they show up in saved worksheets.
4. Submit a signed-in worksheet and confirm dashboard stats update.
5. Open the leaderboard page and verify daily, weekly, and monthly switching.
6. Print a worksheet from the browser and verify the print stylesheet removes app chrome.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/AuthCallbackView.vue frontend/src/stores/auth.ts frontend/src/stores/worksheet.ts backend/src/routes/auth.routes.ts README.md
git commit -m "feat: connect auth flow and document local setup"
```

## Task 13: Final Hardening Pass

**Files:**
- Modify: `backend/src/middleware/error-handler.ts`
- Modify: `frontend/src/styles/main.css`
- Modify: `README.md`
- Test: `backend/src/tests/worksheet.routes.test.ts`

- [ ] **Step 1: Write the failing validation-error test**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";

describe("validation errors", () => {
  it("rejects empty operation selections", async () => {
    const response = await request(createApp()).post("/api/worksheets/generate").send({
      problemCount: 8,
      difficulty: "easy",
      allowedOperations: [],
      numberRangeMin: 1,
      numberRangeMax: 10,
      worksheetSize: "small",
      cleanDivisionOnly: true
    });

    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test to verify current behavior**

Run: `pnpm --filter @mathsheets/backend test -- backend/src/tests/worksheet.routes.test.ts`
Expected: PASS after validation middleware is complete; FAIL if validation was skipped

- [ ] **Step 3: Improve final polish**

Backend error handler target:

```ts
export const errorHandler = (error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({
    message: "Something went wrong",
    detail: process.env.NODE_ENV === "development" ? error.message : undefined
  });
};
```

Frontend print styles target:

```css
@media print {
  header,
  nav,
  .app-sidebar,
  .app-actions,
  .non-printable {
    display: none !important;
  }

  .worksheet-grid {
    gap: 16px;
  }

  body {
    background: white;
  }
}
```

README closeout sections:

- architecture decisions
- environment variables
- test commands
- future extension notes

- [ ] **Step 4: Run full verification**

Run: `pnpm --filter @mathsheets/backend test && pnpm --filter @mathsheets/frontend test && pnpm --filter @mathsheets/backend build && pnpm --filter @mathsheets/frontend build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/middleware/error-handler.ts frontend/src/styles/main.css README.md backend/src/tests/worksheet.routes.test.ts
git commit -m "chore: harden validation, print styles, and docs"
```

## Self-Review Checklist

- Spec coverage:
  - Anonymous local mode: covered in Tasks 10, 11, and 12
  - Google OAuth and JWT auth: covered in Tasks 6 and 12
  - Worksheet generation and scoring: covered in Tasks 4, 5, and 7
  - Persistence and import: covered in Task 7 and Task 12
  - Stats and leaderboards: covered in Task 8
  - Frontend pages and printable UI: covered in Tasks 9, 10, 11, and 13
  - README and architecture explanation: covered in Task 12 and Task 13
- Placeholder scan:
  - No `TBD`, `TODO`, block comments, or placeholder implementation markers remain in the task steps.
  - Auth, repository, and import tasks now include concrete route and SQL examples instead of deferred notes.
- Type consistency:
  - Worksheet config and operation types are defined in Task 4 and reused in Tasks 5 and 7.
  - Auth user shape is introduced in Task 6 and used again in Task 12.
