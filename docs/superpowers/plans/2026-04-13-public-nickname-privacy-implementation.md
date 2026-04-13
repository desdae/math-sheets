# Public Nickname Privacy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a privacy-safe public nickname model so Google identity data stays backend-only, first-time signed-in users set a nickname before entering the app, and users can edit that nickname later from Profile.

**Architecture:** Keep Google OAuth as the private authentication layer, add a separate `public_nickname` field to `users`, and thread a new privacy-safe user contract through the auth, profile, and leaderboard flows. The frontend should stop depending on Google `displayName` and `avatarUrl`, route nickname-less users through a short onboarding step, and show only `publicNickname` on user-facing surfaces.

**Tech Stack:** Vue 3 + Vite, Pinia, Vue Router, Node.js + Express, PostgreSQL, Vitest, Playwright

---

## File Map

### Backend

- Modify: `database/schema.sql`
  - Add `public_nickname` to `users`, backfill existing rows, and update leaderboard views/indexes to use nickname instead of Google display name.
- Modify: `backend/src/repositories/user.repository.ts`
  - Separate private Google profile persistence from public nickname behavior.
- Modify: `backend/src/repositories/leaderboard.repository.ts`
  - Sort and return leaderboard rows using `public_nickname`.
- Modify: `backend/src/routes/auth.routes.ts`
  - Return privacy-safe user payload from `/auth/me`.
- Modify: `backend/src/routes/user.routes.ts`
  - Add authenticated nickname update endpoint.
- Modify: `backend/src/routes/test-auth.routes.ts`
  - Let test auth create users with public nicknames and return the new user shape.
- Modify: `backend/src/types/auth.ts`
  - Keep Google profile typing private and aligned with repository usage.
- Create: `backend/src/schemas/user.schema.ts`
  - Central nickname validation for update requests.
- Create: `backend/src/tests/user.repository.test.ts`
  - Cover nickname creation/preservation rules and case-insensitive uniqueness behavior.
- Create: `backend/src/tests/user.routes.test.ts`
  - Cover `/auth/me` privacy-safe response and nickname update endpoint.
- Modify: `backend/src/tests/leaderboard.repository.test.ts`
  - Assert leaderboard rows use `public_nickname`.
- Modify: `backend/src/tests/worksheet.routes.test.ts`
  - Keep test-auth expectations aligned with the new public nickname payload.

### Frontend

- Modify: `frontend/src/stores/auth.ts`
  - Replace `displayName`/`avatarUrl` assumptions with `publicNickname` and onboarding state.
- Modify: `frontend/src/router/index.ts`
  - Register nickname setup route.
- Modify: `frontend/src/views/AuthCallbackView.vue`
  - Route nickname-less users to setup before dashboard/import flow.
- Create: `frontend/src/views/CompleteProfileView.vue`
  - Implement first-sign-in nickname setup screen.
- Modify: `frontend/src/views/ProfileView.vue`
  - Show public nickname and allow editing it.
- Modify: `frontend/src/views/DashboardView.vue`
  - Welcome the user by public nickname.
- Modify: `frontend/src/views/LeaderboardView.vue`
  - Consume nickname-only leaderboard data.
- Modify: `frontend/src/components/leaderboard/LeaderboardTable.vue`
  - Render `public_nickname` instead of `display_name`.
- Modify: `frontend/src/stores/leaderboard.ts`
  - Rename leaderboard row typing to public nickname fields.
- Create: `frontend/src/tests/complete-profile-view.test.ts`
  - Cover onboarding form behavior and redirect after save.
- Modify: `frontend/src/tests/auth.store.test.ts`
  - Cover privacy-safe auth store behavior.
- Modify: `frontend/src/tests/anonymous-worksheets.test.ts`
  - Update mocked signed-in user payload to use `publicNickname`.
- Modify: `frontend/src/tests/saved-worksheets-view.test.ts`
  - Update mocked signed-in user payload to use `publicNickname`.

### End-to-End and Docs

- Modify: `e2e/specs/flows/import-local-progress.spec.ts`
  - Ensure nickname setup happens before import prompt for first-time sign-in.
- Create: `e2e/specs/flows/nickname-onboarding.spec.ts`
  - Cover first sign-in nickname setup and later profile editing.
- Modify: `README.md`
  - Document that Google identity is private and the app uses a public nickname.

---

### Task 1: Add Public Nickname Data Model And Privacy-Safe Backend Contract

**Files:**
- Modify: `database/schema.sql`
- Modify: `backend/src/types/auth.ts`
- Modify: `backend/src/repositories/user.repository.ts`
- Modify: `backend/src/routes/auth.routes.ts`
- Create: `backend/src/tests/user.repository.test.ts`
- Create: `backend/src/tests/user.routes.test.ts`

- [ ] **Step 1: Write the failing repository test for preserved and backfilled public nicknames**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../db/pool.js", () => ({
  pool: {
    query: queryMock
  }
}));

describe("findOrCreateUserFromGoogleProfile", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("keeps a user's existing public nickname when Google display name changes", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: "user-1",
            email: "kid@example.com",
            display_name: "Google Name",
            public_nickname: "Quiet Fox",
            avatar_url: "https://example.com/avatar.png"
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] });

    const { findOrCreateUserFromGoogleProfile } = await import("../repositories/user.repository.js");

    const user = await findOrCreateUserFromGoogleProfile({
      googleSub: "google-sub-1",
      email: "kid@example.com",
      displayName: "Changed Google Name",
      avatarUrl: "https://example.com/new-avatar.png"
    });

    expect(user.public_nickname).toBe("Quiet Fox");
  });
});
```

- [ ] **Step 2: Run the repository test to verify it fails**

Run: `npm run test --workspace backend -- src/tests/user.repository.test.ts`

Expected: FAIL because the repository test file does not exist yet or because `public_nickname` is not part of the repository contract.

- [ ] **Step 3: Write the failing route test for privacy-safe `/auth/me`**

```ts
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";

const findUserByIdMock = vi.fn();

vi.mock("../repositories/user.repository.js", async () => {
  const actual = await vi.importActual("../repositories/user.repository.js");
  return {
    ...actual,
    findUserById: findUserByIdMock
  };
});

describe("auth me response", () => {
  beforeEach(() => {
    findUserByIdMock.mockReset();
  });

  it("returns public nickname without leaking Google display fields", async () => {
    findUserByIdMock.mockResolvedValue({
      id: "user-1",
      email: "kid@example.com",
      public_nickname: "Quiet Fox",
      display_name: "Google Name",
      avatar_url: "https://example.com/avatar.png"
    });

    const app = createApp();
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer test-token");

    expect(response.body.user).toEqual({
      id: "user-1",
      email: "kid@example.com",
      publicNickname: "Quiet Fox"
    });
    expect(response.body.user.displayName).toBeUndefined();
    expect(response.body.user.avatarUrl).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run the route test to verify it fails**

Run: `npm run test --workspace backend -- src/tests/user.routes.test.ts`

Expected: FAIL because the route test file does not exist yet or because `/auth/me` still returns `displayName` and `avatarUrl`.

- [ ] **Step 5: Update the schema and repository minimally**

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_nickname TEXT;

UPDATE users
SET public_nickname = display_name
WHERE public_nickname IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_public_nickname_lower_unique
ON users (LOWER(public_nickname))
WHERE public_nickname IS NOT NULL;
```

```ts
export const findOrCreateUserFromGoogleProfile = async (profile: GoogleProfile) => {
  const result = await pool.query(
    `INSERT INTO users (google_sub, email, display_name, avatar_url, public_nickname)
     VALUES ($1, $2, $3, $4, $3)
     ON CONFLICT (google_sub)
     DO UPDATE SET
       email = EXCLUDED.email,
       display_name = EXCLUDED.display_name,
       avatar_url = EXCLUDED.avatar_url,
       updated_at = NOW(),
       last_login_at = NOW()
     RETURNING *`,
    [profile.googleSub, profile.email, profile.displayName, profile.avatarUrl]
  );

  return result.rows[0];
};
```

```ts
res.json({
  user: {
    id: user.id,
    email: user.email,
    publicNickname: user.public_nickname
  }
});
```

- [ ] **Step 6: Run the backend tests to verify they pass**

Run:

- `npm run test --workspace backend -- src/tests/user.repository.test.ts`
- `npm run test --workspace backend -- src/tests/user.routes.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add database/schema.sql backend/src/types/auth.ts backend/src/repositories/user.repository.ts backend/src/routes/auth.routes.ts backend/src/tests/user.repository.test.ts backend/src/tests/user.routes.test.ts
git commit -m "Add public nickname backend contract"
```

### Task 2: Add Nickname Validation And Update Endpoint

**Files:**
- Create: `backend/src/schemas/user.schema.ts`
- Modify: `backend/src/routes/user.routes.ts`
- Modify: `backend/src/repositories/user.repository.ts`
- Modify: `backend/src/tests/user.routes.test.ts`

- [ ] **Step 1: Write the failing route test for nickname updates**

```ts
it("updates the signed-in user's public nickname", async () => {
  const response = await request(createApp())
    .patch("/api/users/me/profile")
    .set("Authorization", "Bearer test-token")
    .send({ publicNickname: "Quiet Fox" });

  expect(response.status).toBe(200);
  expect(response.body.user.publicNickname).toBe("Quiet Fox");
});

it("rejects case-insensitive duplicate public nicknames", async () => {
  const response = await request(createApp())
    .patch("/api/users/me/profile")
    .set("Authorization", "Bearer test-token")
    .send({ publicNickname: "quiet fox" });

  expect(response.status).toBe(409);
  expect(response.body.message).toContain("already taken");
});
```

- [ ] **Step 2: Run the route test to verify it fails**

Run: `npm run test --workspace backend -- src/tests/user.routes.test.ts`

Expected: FAIL because `PATCH /api/users/me/profile` does not exist yet.

- [ ] **Step 3: Add the nickname schema and repository helper**

```ts
import { z } from "zod";

const reservedNicknames = new Set(["admin", "support", "mathsheets"]);

export const updatePublicNicknameSchema = z.object({
  publicNickname: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[A-Za-z0-9 _-]+$/)
    .refine((value) => !reservedNicknames.has(value.toLowerCase()), {
      message: "Nickname is reserved"
    })
});
```

```ts
export const updatePublicNickname = async (userId: string, publicNickname: string) => {
  try {
    const result = await pool.query(
      `UPDATE users
       SET public_nickname = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, public_nickname`,
      [userId, publicNickname]
    );

    return result.rows[0];
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "Nickname is already taken");
    }
    throw error;
  }
};
```

- [ ] **Step 4: Add the route minimally**

```ts
userRouter.patch(
  "/me/profile",
  authenticate,
  validateBody(updatePublicNicknameSchema),
  asyncHandler(async (req, res) => {
    const user = await updatePublicNickname(req.user!.id, req.body.publicNickname);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        publicNickname: user.public_nickname
      }
    });
  })
);
```

- [ ] **Step 5: Run the backend tests to verify they pass**

Run:

- `npm run test --workspace backend -- src/tests/user.routes.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/schemas/user.schema.ts backend/src/routes/user.routes.ts backend/src/repositories/user.repository.ts backend/src/tests/user.routes.test.ts
git commit -m "Add public nickname update endpoint"
```

### Task 3: Route Nickname-Less Users Through Onboarding

**Files:**
- Modify: `frontend/src/router/index.ts`
- Modify: `frontend/src/stores/auth.ts`
- Modify: `frontend/src/views/AuthCallbackView.vue`
- Create: `frontend/src/views/CompleteProfileView.vue`
- Create: `frontend/src/tests/complete-profile-view.test.ts`
- Modify: `frontend/src/tests/auth.store.test.ts`

- [ ] **Step 1: Write the failing onboarding view test**

```ts
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CompleteProfileView from "../views/CompleteProfileView.vue";
import { useAuthStore } from "../stores/auth";

const push = vi.fn();
const apiFetchMock = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({ push })
}));

vi.mock("../lib/api", () => ({
  authTokenStorageKey: "mathsheets.access_token",
  setStoredToken: vi.fn(),
  apiFetch: (...args: unknown[]) => apiFetchMock(...args)
}));

describe("CompleteProfileView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    push.mockReset();
    apiFetchMock.mockReset();
  });

  it("saves a nickname and routes to the dashboard", async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: "user-1",
      email: "kid@example.com",
      publicNickname: null
    };

    apiFetchMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "kid@example.com",
        publicNickname: "Quiet Fox"
      }
    });

    const wrapper = mount(CompleteProfileView);
    await wrapper.get('[data-testid="nickname-input"]').setValue("Quiet Fox");
    await wrapper.get('[data-testid="nickname-submit"]').trigger("click");

    expect(push).toHaveBeenCalledWith("/dashboard");
  });
});
```

- [ ] **Step 2: Run the frontend test to verify it fails**

Run: `npm run test --workspace frontend -- src/tests/complete-profile-view.test.ts`

Expected: FAIL because the view and auth store support do not exist yet.

- [ ] **Step 3: Write the failing auth callback redirect test**

```ts
it("marks users without a nickname as needing onboarding", async () => {
  setActivePinia(createPinia());
  const store = useAuthStore();

  apiFetchMock.mockResolvedValue({
    user: {
      id: "user-1",
      email: "kid@example.com",
      publicNickname: null
    }
  });

  await store.fetchMe();

  expect(store.needsNickname).toBe(true);
});
```

- [ ] **Step 4: Run the auth store test to verify it fails**

Run: `npm run test --workspace frontend -- src/tests/auth.store.test.ts`

Expected: FAIL because the store does not expose `needsNickname` or nullable `publicNickname`.

- [ ] **Step 5: Implement the minimal auth model, route, and onboarding view**

```ts
type User = {
  id: string;
  email: string;
  publicNickname: string | null;
};

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as User | null,
    accessToken: localStorage.getItem(authTokenStorageKey) ?? "",
    hasCheckedAuth: false,
    isLoading: false
  }),
  getters: {
    needsNickname: (state) => Boolean(state.user && !state.user.publicNickname)
  }
});
```

```ts
{ path: "/complete-profile", component: () => import("../views/CompleteProfileView.vue") }
```

```ts
if (authStore.needsNickname) {
  router.replace("/complete-profile");
  return;
}
```

```vue
<template>
  <section class="page-stack" data-testid="complete-profile-page">
    <div class="card" style="max-width: 540px; margin: 0 auto;">
      <p class="eyebrow">Finish setup</p>
      <h1>Choose your public nickname</h1>
      <p class="lede">Google account details stay private. This nickname is what the app will show publicly.</p>
      <input data-testid="nickname-input" v-model="publicNickname" type="text" maxlength="24" />
      <p v-if="errorMessage">{{ errorMessage }}</p>
      <button data-testid="nickname-submit" class="button" @click="saveNickname">Save and continue</button>
    </div>
  </section>
</template>
```

- [ ] **Step 6: Run the frontend tests to verify they pass**

Run:

- `npm run test --workspace frontend -- src/tests/auth.store.test.ts`
- `npm run test --workspace frontend -- src/tests/complete-profile-view.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/router/index.ts frontend/src/stores/auth.ts frontend/src/views/AuthCallbackView.vue frontend/src/views/CompleteProfileView.vue frontend/src/tests/complete-profile-view.test.ts frontend/src/tests/auth.store.test.ts
git commit -m "Add nickname onboarding flow"
```

### Task 4: Add Profile Editing And Replace Display Name Usage In The App

**Files:**
- Modify: `frontend/src/views/ProfileView.vue`
- Modify: `frontend/src/views/DashboardView.vue`
- Modify: `frontend/src/tests/anonymous-worksheets.test.ts`
- Modify: `frontend/src/tests/saved-worksheets-view.test.ts`
- Modify: `frontend/src/tests/complete-profile-view.test.ts`

- [ ] **Step 1: Write the failing profile edit test**

```ts
it("updates the signed-in user's nickname from profile", async () => {
  apiFetchMock.mockResolvedValue({
    user: {
      id: "user-1",
      email: "kid@example.com",
      publicNickname: "Quiet Fox"
    }
  });

  const wrapper = mount(ProfileView);
  await wrapper.get('[data-testid="profile-nickname-input"]').setValue("Brave Owl");
  await wrapper.get('[data-testid="profile-nickname-save"]').trigger("click");

  expect(wrapper.text()).toContain("Brave Owl");
});
```

- [ ] **Step 2: Run the frontend test to verify it fails**

Run: `npm run test --workspace frontend -- src/tests/complete-profile-view.test.ts`

Expected: FAIL because the profile page has no nickname editor yet.

- [ ] **Step 3: Implement the minimal profile editor and app-wide nickname usage**

```vue
<h1>{{ authStore.user?.publicNickname ?? "Anonymous user" }}</h1>
<p v-if="authStore.user">{{ authStore.user.email }}</p>
<input data-testid="profile-nickname-input" v-model="nicknameDraft" type="text" maxlength="24" />
<button data-testid="profile-nickname-save" class="button" @click="saveNickname">Save nickname</button>
```

```ts
<h1>{{ authStore.user ? `Welcome back, ${authStore.user.publicNickname}` : "Anonymous practice mode" }}</h1>
```

```ts
authStore.user = {
  id: "user-1",
  email: "test@example.com",
  publicNickname: "Quiet Fox"
};
```

- [ ] **Step 4: Run the affected frontend tests to verify they pass**

Run:

- `npm run test --workspace frontend -- src/tests/complete-profile-view.test.ts`
- `npm run test --workspace frontend -- src/tests/anonymous-worksheets.test.ts`
- `npm run test --workspace frontend -- src/tests/saved-worksheets-view.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/ProfileView.vue frontend/src/views/DashboardView.vue frontend/src/tests/anonymous-worksheets.test.ts frontend/src/tests/saved-worksheets-view.test.ts frontend/src/tests/complete-profile-view.test.ts
git commit -m "Use public nicknames in profile and dashboard"
```

### Task 5: Switch Leaderboards And Test Auth To Public Nicknames

**Files:**
- Modify: `backend/src/repositories/leaderboard.repository.ts`
- Modify: `backend/src/routes/test-auth.routes.ts`
- Modify: `backend/src/tests/leaderboard.repository.test.ts`
- Modify: `backend/src/tests/worksheet.routes.test.ts`
- Modify: `frontend/src/stores/leaderboard.ts`
- Modify: `frontend/src/components/leaderboard/LeaderboardTable.vue`
- Modify: `frontend/src/views/LeaderboardView.vue`

- [ ] **Step 1: Write the failing backend leaderboard test**

```ts
it("returns public nicknames in leaderboard rows", async () => {
  queryMock.mockResolvedValueOnce({
    rows: [
      {
        user_id: "user-1",
        public_nickname: "Quiet Fox",
        worksheets_completed: 5,
        problems_solved: 60,
        accuracy_percentage: 95
      }
    ]
  });

  const { getLeaderboard } = await import("../repositories/leaderboard.repository.js");
  const rows = await getLeaderboard({ period: "daily", metric: "worksheets" });

  expect(rows[0].public_nickname).toBe("Quiet Fox");
});
```

- [ ] **Step 2: Run the backend test to verify it fails**

Run: `npm run test --workspace backend -- src/tests/leaderboard.repository.test.ts`

Expected: FAIL because leaderboard sorting/typing still uses `display_name`.

- [ ] **Step 3: Update leaderboard and test-auth contracts minimally**

```ts
const metricOrderMap = {
  worksheets: "worksheets_completed DESC, problems_solved DESC, public_nickname ASC",
  problems: "problems_solved DESC, worksheets_completed DESC, public_nickname ASC",
  accuracy: "accuracy_percentage DESC, problems_solved DESC, public_nickname ASC"
} as const;
```

```ts
const loginSchema = z.object({
  email: z.string().email().default("e2e@example.com"),
  publicNickname: z.string().trim().min(1).nullable().optional()
});
```

```vue
<td>{{ row.public_nickname }}</td>
```

```ts
type LeaderboardRow = {
  user_id: string;
  public_nickname: string;
  worksheets_completed: number;
  problems_solved: number;
  correct_answers: number;
  accuracy_percentage: number;
};
```

- [ ] **Step 4: Run backend and frontend leaderboard checks**

Run:

- `npm run test --workspace backend -- src/tests/leaderboard.repository.test.ts`
- `npm run test --workspace backend -- src/tests/worksheet.routes.test.ts`
- `npm run build --workspace frontend`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/repositories/leaderboard.repository.ts backend/src/routes/test-auth.routes.ts backend/src/tests/leaderboard.repository.test.ts backend/src/tests/worksheet.routes.test.ts frontend/src/stores/leaderboard.ts frontend/src/components/leaderboard/LeaderboardTable.vue frontend/src/views/LeaderboardView.vue
git commit -m "Show public nicknames on leaderboards"
```

### Task 6: Add End-To-End Coverage And Document The Privacy Model

**Files:**
- Create: `e2e/specs/flows/nickname-onboarding.spec.ts`
- Modify: `e2e/specs/flows/import-local-progress.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Write the failing E2E spec for first sign-in nickname setup**

```ts
import { expect } from "@playwright/test";
import { test } from "../../fixtures/base";
import { resetE2EDatabase } from "../../utils/database";

test.beforeEach(async () => {
  await resetE2EDatabase();
});

test("first sign-in requires a public nickname before entering the app", async ({ page }) => {
  const response = await page.context().request.post("http://127.0.0.1:3001/api/test-auth/login", {
    data: {
      email: "privacy@example.com"
    }
  });

  const payload = (await response.json()) as { accessToken: string };
  await page.goto(`/auth/callback?access_token=${encodeURIComponent(payload.accessToken)}`);

  await expect(page).toHaveURL("/complete-profile");
  await page.getByTestId("nickname-input").fill("Quiet Fox");
  await page.getByTestId("nickname-submit").click();
  await expect(page).toHaveURL("/dashboard");
});
```

- [ ] **Step 2: Run the E2E spec to verify it fails**

Run: `npm run test:e2e -- e2e/specs/flows/nickname-onboarding.spec.ts`

Expected: FAIL because nickname onboarding is not fully wired through end to end yet.

- [ ] **Step 3: Update the existing import flow and README**

```ts
await page.goto(`/auth/callback?access_token=${encodeURIComponent(payload.accessToken)}`);
await expect(page).toHaveURL("/complete-profile");
await page.getByTestId("nickname-input").fill("Import User");
await page.getByTestId("nickname-submit").click();
await expect(page.getByTestId("import-local-modal")).toBeVisible();
```

```md
### Privacy And Public Identity

Google is used only for authentication. The app stores Google account details privately on the backend and exposes only a user-chosen public nickname to the frontend. Leaderboards and other user-facing surfaces display the public nickname rather than the Google profile name.
```

- [ ] **Step 4: Run the E2E and final verification commands**

Run:

- `npm run test:e2e -- --workers=1 e2e/specs/flows/nickname-onboarding.spec.ts e2e/specs/flows/import-local-progress.spec.ts`
- `npm run test --workspace backend`
- `npm run test --workspace frontend`
- `npm run build --workspace frontend`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add e2e/specs/flows/nickname-onboarding.spec.ts e2e/specs/flows/import-local-progress.spec.ts README.md
git commit -m "Test and document public nickname privacy flow"
```

## Self-Review

- Spec coverage: covered the database split, privacy-safe auth payloads, nickname update endpoint, first-sign-in onboarding, profile editing, leaderboard rendering, migration/backfill, and automated coverage.
- Placeholder scan: removed vague “add validation” wording by naming the exact schema, endpoint, route, and tests to add.
- Type consistency: the plan consistently uses `publicNickname` on the frontend and `public_nickname` in the database/backend row layer, with only private Google profile types retaining `displayName` and `avatarUrl`.
