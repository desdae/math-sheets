# Endpoint Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the current worksheet authorization, import-integrity, OAuth, and refresh-token revocation gaps so authenticated users cannot tamper with other users' data or gain competitive credit through forged payloads.

**Architecture:** Keep the existing Express + repository structure, but make ownership explicit at every worksheet read/write boundary, separate imported-local continuity from leaderboard/stat credit, and harden the OAuth callback to use `state` plus a clean frontend handoff through the existing refresh-cookie flow. Token revocation stays server-side in the existing `refresh_tokens` table rather than introducing a new session store.

**Tech Stack:** Node.js, Express, TypeScript, PostgreSQL, Vitest, Supertest, Playwright

---

## File Map

**Modify**
- `C:/SL/ailab/_web/mathsheets/backend/src/routes/worksheet.routes.ts`
- `C:/SL/ailab/_web/mathsheets/backend/src/repositories/worksheet.repository.ts`
- `C:/SL/ailab/_web/mathsheets/backend/src/routes/auth.routes.ts`
- `C:/SL/ailab/_web/mathsheets/backend/src/services/token.service.ts`
- `C:/SL/ailab/_web/mathsheets/backend/src/repositories/token.repository.ts`
- `C:/SL/ailab/_web/mathsheets/backend/src/schemas/worksheet.schema.ts`
- `C:/SL/ailab/_web/mathsheets/backend/src/app.ts`
- `C:/SL/ailab/_web/mathsheets/backend/src/tests/worksheet.routes.test.ts`
- `C:/SL/ailab/_web/mathsheets/backend/src/tests/worksheet-save-completion.test.ts`
- `C:/SL/ailab/_web/mathsheets/backend/src/tests/user.routes.test.ts`
- `C:/SL/ailab/_web/mathsheets/frontend/src/views/AuthCallbackView.vue`
- `C:/SL/ailab/_web/mathsheets/frontend/src/stores/auth.ts`
- `C:/SL/ailab/_web/mathsheets/frontend/src/stores/worksheet.ts`
- `C:/SL/ailab/_web/mathsheets/frontend/src/tests/auth.store.test.ts`
- `C:/SL/ailab/_web/mathsheets/frontend/src/tests/anonymous-worksheets.test.ts`
- `C:/SL/ailab/_web/mathsheets/e2e/specs/flows/nickname-onboarding.spec.ts`
- `C:/SL/ailab/_web/mathsheets/e2e/specs/flows/import-local-progress.spec.ts`
- `C:/SL/ailab/_web/mathsheets/README.md`

**Create**
- `C:/SL/ailab/_web/mathsheets/backend/src/tests/worksheet-authorization.test.ts`
- `C:/SL/ailab/_web/mathsheets/backend/src/tests/auth.routes.security.test.ts`
- `C:/SL/ailab/_web/mathsheets/database/migrations/2026-04-13-worksheet-credit.sql`

---

### Task 1: Enforce Worksheet Ownership On Every Private Endpoint

**Files:**
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/routes/worksheet.routes.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/repositories/worksheet.repository.ts`
- Create: `C:/SL/ailab/_web/mathsheets/backend/src/tests/worksheet-authorization.test.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/tests/worksheet-save-completion.test.ts`

- [ ] **Step 1: Write the failing authorization tests**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { signAccessToken } from "../lib/jwt.js";

const {
  getWorksheetDetailsMock,
  saveWorksheetAnswersMock,
  submitWorksheetMock
} = vi.hoisted(() => ({
  getWorksheetDetailsMock: vi.fn(),
  saveWorksheetAnswersMock: vi.fn(),
  submitWorksheetMock: vi.fn()
}));

vi.mock("../repositories/worksheet.repository.js", async () => {
  const actual = await vi.importActual<typeof import("../repositories/worksheet.repository.js")>(
    "../repositories/worksheet.repository.js"
  );

  return {
    ...actual,
    getWorksheetDetails: getWorksheetDetailsMock,
    saveWorksheetAnswers: saveWorksheetAnswersMock,
    submitWorksheet: submitWorksheetMock
  };
});

describe("worksheet ownership enforcement", () => {
  beforeEach(() => {
    getWorksheetDetailsMock.mockReset();
    saveWorksheetAnswersMock.mockReset();
    submitWorksheetMock.mockReset();
  });

  it("passes the signed-in user id into worksheet detail lookups", async () => {
    getWorksheetDetailsMock.mockResolvedValue({ worksheet: null, questions: [], answers: [] });

    const response = await request(createApp())
      .get("/api/worksheets/worksheet-123")
      .set("Authorization", `Bearer ${signAccessToken("user-1")}`);

    expect(response.status).toBe(200);
    expect(getWorksheetDetailsMock).toHaveBeenCalledWith("worksheet-123", "user-1");
  });

  it("returns 404 when saving a worksheet the caller does not own", async () => {
    saveWorksheetAnswersMock.mockRejectedValue({ statusCode: 404, message: "Worksheet not found" });

    const response = await request(createApp())
      .patch("/api/worksheets/worksheet-123/save")
      .set("Authorization", `Bearer ${signAccessToken("user-2")}`)
      .send({
        answers: [{ questionId: "00000000-0000-0000-0000-000000000001", answerText: "7" }],
        elapsedSeconds: 3,
        status: "partial"
      });

    expect(response.status).toBe(404);
    expect(saveWorksheetAnswersMock).toHaveBeenCalledWith(
      expect.objectContaining({ worksheetId: "worksheet-123", userId: "user-2" })
    );
  });
});
```

- [ ] **Step 2: Run the authorization tests to verify they fail**

Run: `npm run test --workspace backend -- src/tests/worksheet-authorization.test.ts`

Expected: FAIL because the current route handlers call the repository without `userId`.

- [ ] **Step 3: Update route handlers to pass the caller identity through**

```ts
worksheetRouter.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await getWorksheetDetails(String(req.params.id), req.user!.id));
  })
);

worksheetRouter.patch(
  "/:id/save",
  authenticate,
  validateBody(saveWorksheetSchema),
  asyncHandler(async (req, res) => {
    res.json(
      await saveWorksheetAnswers({
        worksheetId: String(req.params.id),
        userId: req.user!.id,
        answers: req.body.answers,
        elapsedSeconds: req.body.elapsedSeconds,
        status: req.body.status
      })
    );
  })
);

worksheetRouter.post(
  "/:id/submit",
  authenticate,
  validateBody(submitWorksheetSchema),
  asyncHandler(async (req, res) => {
    res.json(
      await submitWorksheet({
        worksheetId: String(req.params.id),
        userId: req.user!.id,
        answers: req.body.answers
      })
    );
  })
);
```

- [ ] **Step 4: Scope repository queries by both worksheet id and user id**

```ts
const findOwnedWorksheet = async (client: typeof pool | Awaited<ReturnType<typeof pool.connect>>, worksheetId: string, userId: string) => {
  const result = await client.query(
    `SELECT id, status, source
     FROM worksheets
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [worksheetId, userId]
  );

  const worksheet = result.rows[0];
  if (!worksheet) {
    throw new HttpError(404, "Worksheet not found");
  }

  return worksheet;
};

export const getWorksheetDetails = async (worksheetId: string, userId: string) => {
  const worksheetResult = await pool.query(
    `SELECT *
     FROM worksheets
     WHERE id = $1 AND user_id = $2`,
    [worksheetId, userId]
  );

  if (!worksheetResult.rows[0]) {
    throw new HttpError(404, "Worksheet not found");
  }

  // keep the existing question and answer mapping after the ownership check
};
```

- [ ] **Step 5: Validate that saved answer question ids belong to the owned worksheet**

```ts
const questionResult = await client.query(
  `SELECT id
   FROM worksheet_questions
   WHERE worksheet_id = $1`,
  [input.worksheetId]
);

const allowedQuestionIds = new Set(questionResult.rows.map((row) => row.id));

for (const answer of input.answers) {
  if (!allowedQuestionIds.has(answer.questionId)) {
    throw new HttpError(400, "Answer question does not belong to worksheet");
  }
}
```

- [ ] **Step 6: Run the focused backend tests**

Run: `npm run test --workspace backend -- src/tests/worksheet-authorization.test.ts src/tests/worksheet-save-completion.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/worksheet.routes.ts backend/src/repositories/worksheet.repository.ts backend/src/tests/worksheet-authorization.test.ts backend/src/tests/worksheet-save-completion.test.ts
git commit -m "fix: enforce worksheet ownership"
```

---

### Task 2: Stop Imported Local Worksheets From Minting Competitive Credit

**Files:**
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/repositories/worksheet.repository.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/schemas/worksheet.schema.ts`
- Create: `C:/SL/ailab/_web/mathsheets/database/migrations/2026-04-13-worksheet-credit.sql`
- Modify: `C:/SL/ailab/_web/mathsheets/database/views.sql`
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/tests/worksheet.routes.test.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/tests/leaderboard.repository.test.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/frontend/src/stores/worksheet.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/frontend/src/tests/anonymous-worksheets.test.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/README.md`

- [ ] **Step 1: Write the failing import-integrity tests**

```ts
it("does not award leaderboard credit to imported completed worksheets", async () => {
  const imported = await importLocalWorksheets("user-1", [
    {
      localImportKey: "local-1",
      title: "Imported worksheet",
      status: "completed",
      config: {
        problemCount: 2,
        difficulty: "easy",
        allowedOperations: ["+"],
        numberRangeMin: 1,
        numberRangeMax: 10,
        worksheetSize: "small",
        cleanDivisionOnly: true
      },
      questions: [
        { questionOrder: 1, operation: "+", leftOperand: 1, rightOperand: 1, displayText: "1 + 1 =", correctAnswer: 2 },
        { questionOrder: 2, operation: "+", leftOperand: 2, rightOperand: 2, displayText: "2 + 2 =", correctAnswer: 4 }
      ],
      answers: ["2", "4"],
      createdAt: new Date().toISOString()
    }
  ]);

  expect(imported[0].worksheet.status).toBe("completed");

  const leaderboard = await getLeaderboard({ period: "daily", metric: "worksheets" });
  expect(leaderboard.find((entry) => entry.user_id === "user-1")).toBeUndefined();
});
```

- [ ] **Step 2: Run the import-integrity tests to verify they fail**

Run: `npm run test --workspace backend -- src/tests/worksheet.routes.test.ts src/tests/leaderboard.repository.test.ts`

Expected: FAIL because imported completed worksheets currently increase stats and leaderboard totals.

- [ ] **Step 3: Add an explicit `awards_credit` flag to worksheets**

```sql
ALTER TABLE worksheets
ADD COLUMN IF NOT EXISTS awards_credit BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE worksheets
SET awards_credit = FALSE
WHERE source = 'imported';
```

- [ ] **Step 4: Set imported worksheets to `awards_credit = false` during creation**

```ts
const awardsCredit = input.source === "generated";

const worksheetResult = await client.query(
  `INSERT INTO worksheets (
    user_id, title, status, difficulty, problem_count, allowed_operations,
    number_range_min, number_range_max, worksheet_size, clean_division_only,
    source, local_import_key, started_at, created_at, awards_credit
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
  RETURNING *`,
  [
    input.userId,
    input.title,
    input.status ?? "draft",
    input.config.difficulty,
    input.config.problemCount,
    input.config.allowedOperations,
    input.config.numberRangeMin,
    input.config.numberRangeMax,
    input.config.worksheetSize,
    input.config.cleanDivisionOnly,
    input.source,
    input.localImportKey ?? randomUUID(),
    initialTimestamp,
    initialTimestamp,
    awardsCredit
  ]
);
```

- [ ] **Step 5: Skip stat mutation and leaderboard inclusion when `awards_credit = false`**

```ts
const attemptResult = await client.query(
  `SELECT att.id, att.user_id, w.awards_credit
   FROM worksheet_attempts att
   JOIN worksheets w ON w.id = att.worksheet_id
   WHERE att.worksheet_id = $1
   ORDER BY att.started_at ASC
   LIMIT 1`,
  [input.worksheetId]
);

if (attempt.user_id && attempt.awards_credit) {
  await client.query(
    `INSERT INTO user_statistics (user_id, worksheets_completed, problems_solved, correct_answers, accuracy_percentage, last_activity_date, updated_at)
     VALUES ($1, 1, $2, $3, $4, CURRENT_DATE, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       worksheets_completed = user_statistics.worksheets_completed + EXCLUDED.worksheets_completed,
       problems_solved = user_statistics.problems_solved + EXCLUDED.problems_solved,
       correct_answers = user_statistics.correct_answers + EXCLUDED.correct_answers,
       accuracy_percentage = ROUND(((user_statistics.correct_answers + EXCLUDED.correct_answers)::numeric / NULLIF(user_statistics.problems_solved + EXCLUDED.problems_solved, 0)) * 100, 2),
       last_activity_date = CURRENT_DATE,
       updated_at = NOW()`,
    [attempt.user_id, scored.scoreTotal, scored.scoreCorrect, scored.accuracyPercentage]
  );
}
```

- [ ] **Step 6: Update leaderboard views to include only competitive worksheets**

```sql
CREATE VIEW leaderboard_daily AS
SELECT
  u.id AS user_id,
  u.public_nickname,
  COUNT(DISTINCT w.id) AS worksheets_completed,
  COALESCE(SUM(a.score_total), 0) AS problems_solved,
  COALESCE(SUM(a.score_correct), 0) AS correct_answers,
  COALESCE(ROUND((SUM(a.score_correct)::numeric / NULLIF(SUM(a.score_total), 0)) * 100, 2), 0) AS accuracy_percentage
FROM users u
JOIN worksheets w ON w.user_id = u.id
JOIN worksheet_attempts a ON a.worksheet_id = w.id
WHERE w.status = 'completed'
  AND w.awards_credit = TRUE
  AND w.submitted_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
GROUP BY u.id, u.public_nickname;
```

- [ ] **Step 7: Preserve import UX while making the no-credit rule explicit**

```ts
// frontend/src/stores/worksheet.ts
if (worksheet.source === "local") {
  // import still sends completed local work for continuity,
  // but backend stores imported worksheets as non-competitive history
}
```

Add one README note:

```md
- Imported anonymous worksheets are synced into account history, but only authenticated server-tracked worksheets count toward leaderboards and aggregated competitive stats.
```

- [ ] **Step 8: Run migration, backend tests, and frontend import tests**

Run: `npm run db:migrate && npm run test --workspace backend -- src/tests/worksheet.routes.test.ts src/tests/leaderboard.repository.test.ts && npm run test --workspace frontend -- src/tests/anonymous-worksheets.test.ts`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add database/migrations/2026-04-13-worksheet-credit.sql database/views.sql backend/src/repositories/worksheet.repository.ts backend/src/schemas/worksheet.schema.ts backend/src/tests/worksheet.routes.test.ts backend/src/tests/leaderboard.repository.test.ts frontend/src/stores/worksheet.ts frontend/src/tests/anonymous-worksheets.test.ts README.md
git commit -m "fix: remove leaderboard credit from imported worksheets"
```

---

### Task 3: Harden Google OAuth With `state` And A Clean Callback Handoff

**Files:**
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/routes/auth.routes.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/app.ts`
- Create: `C:/SL/ailab/_web/mathsheets/backend/src/tests/auth.routes.security.test.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/frontend/src/views/AuthCallbackView.vue`
- Modify: `C:/SL/ailab/_web/mathsheets/frontend/src/stores/auth.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/e2e/specs/flows/nickname-onboarding.spec.ts`

- [ ] **Step 1: Write the failing OAuth security tests**

```ts
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";

describe("google oauth security", () => {
  it("adds a state value to the google redirect", async () => {
    const response = await request(createApp()).get("/api/auth/google");

    if (response.status === 302) {
      expect(response.headers.location).toContain("state=");
    }
  });

  it("rejects callback requests with a missing or mismatched state", async () => {
    const response = await request(createApp()).get("/api/auth/google/callback?code=test-code&state=bad-state");

    expect(response.status).toBe(401);
    expect(response.body.message).toContain("Invalid oauth state");
  });
});
```

- [ ] **Step 2: Run the OAuth security tests to verify they fail**

Run: `npm run test --workspace backend -- src/tests/auth.routes.security.test.ts`

Expected: FAIL because the current Google redirect does not include `state` and the callback does not validate it.

- [ ] **Step 3: Add an OAuth state cookie and validate it on callback**

```ts
const oauthStateCookieName = "mathsheets_oauth_state";

authRouter.get("/google", (_req, res) => {
  const state = randomBytes(24).toString("hex");

  res.cookie(oauthStateCookieName, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/api/auth"
  });

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

authRouter.get("/google/callback", asyncHandler(async (req, res) => {
  const callbackState = String(req.query.state ?? "");
  const cookieState = req.cookies?.[oauthStateCookieName];

  if (!callbackState || !cookieState || callbackState !== cookieState) {
    throw new HttpError(401, "Invalid oauth state");
  }

  res.clearCookie(oauthStateCookieName, { path: "/api/auth" });
  // continue existing code exchange
}));
```

- [ ] **Step 4: Remove the access token from the callback URL and use the refresh cookie handoff**

```ts
authRouter.get("/google/callback", asyncHandler(async (req, res) => {
  const profile = await exchangeCodeForGoogleProfile(code);
  const user = await findOrCreateUserFromGoogleProfile(profile);
  const { refreshToken } = await issueSessionTokens(user.id);

  res.cookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/api/auth"
  });

  res.redirect(`${env.APP_BASE_URL}/auth/callback`);
}));
```

```ts
// frontend/src/views/AuthCallbackView.vue
onMounted(async () => {
  await authStore.restoreSessionFromRefreshCookie();
  router.replace(authStore.user?.publicNickname ? "/dashboard" : "/complete-profile");
});
```

```ts
// frontend/src/stores/auth.ts
const restoreSessionFromRefreshCookie = async () => {
  const refreshResponse = await apiFetch<{ accessToken: string }>("/auth/refresh", {
    method: "POST",
    credentials: "include"
  });

  accessToken.value = refreshResponse.accessToken;
  await fetchCurrentUser();
};
```

- [ ] **Step 5: Run backend tests plus the onboarding E2E flow**

Run: `npm run test --workspace backend -- src/tests/auth.routes.security.test.ts src/tests/user.routes.test.ts && npm run test:e2e -- --workers=1 e2e/specs/flows/nickname-onboarding.spec.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/auth.routes.ts backend/src/app.ts backend/src/tests/auth.routes.security.test.ts frontend/src/views/AuthCallbackView.vue frontend/src/stores/auth.ts e2e/specs/flows/nickname-onboarding.spec.ts
git commit -m "fix: harden oauth callback flow"
```

---

### Task 4: Revoke Refresh Tokens During Logout

**Files:**
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/routes/auth.routes.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/services/token.service.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/repositories/token.repository.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/backend/src/tests/auth.routes.security.test.ts`
- Modify: `C:/SL/ailab/_web/mathsheets/frontend/src/stores/auth.ts`

- [ ] **Step 1: Write the failing logout revocation test**

```ts
it("revokes the refresh token record on logout", async () => {
  const revokeByTokenMock = vi.fn().mockResolvedValue(undefined);

  const response = await request(createApp())
    .post("/api/auth/logout")
    .set("Cookie", ["mathsheets_refresh_token=test-token"]);

  expect(response.status).toBe(204);
  expect(revokeByTokenMock).toHaveBeenCalledWith("test-token");
});
```

- [ ] **Step 2: Run the auth security tests to verify logout still lacks revocation**

Run: `npm run test --workspace backend -- src/tests/auth.routes.security.test.ts`

Expected: FAIL because logout only clears the cookie today.

- [ ] **Step 3: Add single-token revocation helpers and call them from logout**

```ts
// backend/src/repositories/token.repository.ts
export const revokeRefreshTokenByHash = async (userId: string, tokenHash: string) => {
  await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL`,
    [userId, tokenHash]
  );
};
```

```ts
// backend/src/services/token.service.ts
export const revokeRefreshTokenFromCookie = async (refreshToken: string | undefined) => {
  if (!refreshToken) {
    return;
  }

  const payload = verifyRefreshToken(refreshToken);
  await revokeRefreshTokenByHash(payload.userId, hashToken(refreshToken));
};
```

```ts
// backend/src/routes/auth.routes.ts
authRouter.post("/logout", asyncHandler(async (req, res) => {
  await revokeRefreshTokenFromCookie(readRefreshTokenCookie(req));
  res.clearCookie(refreshCookieName, { path: "/api/auth" });
  res.status(204).send();
}));
```

- [ ] **Step 4: Make the frontend logout continue to include cookies**

```ts
await apiFetch("/auth/logout", {
  method: "POST",
  credentials: "include"
});
```

- [ ] **Step 5: Run the auth tests**

Run: `npm run test --workspace backend -- src/tests/auth.routes.security.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/auth.routes.ts backend/src/services/token.service.ts backend/src/repositories/token.repository.ts backend/src/tests/auth.routes.security.test.ts frontend/src/stores/auth.ts
git commit -m "fix: revoke refresh tokens on logout"
```

---

### Task 5: Final Verification And Security Notes

**Files:**
- Modify: `C:/SL/ailab/_web/mathsheets/README.md`

- [ ] **Step 1: Add a short security note to the README**

```md
## Security Notes

- Worksheet detail, save, and submit endpoints are owner-scoped.
- Imported local worksheets sync into account history but do not count toward leaderboard or competitive stats.
- Google OAuth uses a validated `state` value and does not place access tokens in callback URLs.
- Logout revokes the current refresh token server-side.
```

- [ ] **Step 2: Run the full backend security-focused suite**

Run: `npm run test --workspace backend -- src/tests/worksheet-authorization.test.ts src/tests/worksheet.routes.test.ts src/tests/worksheet-save-completion.test.ts src/tests/auth.routes.security.test.ts src/tests/user.routes.test.ts src/tests/leaderboard.repository.test.ts`

Expected: PASS

- [ ] **Step 3: Run frontend and E2E regression coverage**

Run: `npm run test --workspace frontend -- src/tests/auth.store.test.ts src/tests/anonymous-worksheets.test.ts && npm run test:e2e -- --workers=1 e2e/specs/flows/import-local-progress.spec.ts e2e/specs/flows/nickname-onboarding.spec.ts`

Expected: PASS

- [ ] **Step 4: Run the production build and database migration**

Run: `npm run db:migrate && npm run build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: record endpoint security hardening"
```

---

## Self-Review

- **Spec coverage:** The plan covers all five findings: worksheet ownership, import/leaderboard integrity, OAuth `state`, callback token leakage, and logout token revocation.
- **Placeholder scan:** No `TODO`/`TBD` markers remain; every task names exact files, commands, and representative code changes.
- **Type consistency:** Route and repository signatures consistently add `userId` for protected worksheet operations; the import-credit work uses one explicit `awards_credit` flag across schema, repository, and leaderboard views.
