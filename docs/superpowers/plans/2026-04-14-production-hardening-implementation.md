# Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add release-critical Express hardening for same-origin production by shipping security headers, explicit auth cookie policy, and request body limits with backend test coverage and updated docs.

**Architecture:** Keep the hardening localized to the existing Express backend. Global HTTP protections live in `backend/src/app.ts`, auth-cookie policy is centralized inside `backend/src/routes/auth.routes.ts`, and verification stays backend-heavy so the frontend contract does not change. The implementation is intentionally conservative: use Helmet defaults, same-origin HTTPS cookie settings, and tight request-body limits without introducing cross-origin auth or custom CSP work.

**Tech Stack:** Express 5, TypeScript, Vitest, Supertest, cookie-parser, cors, helmet

---

## File map

### Existing files to modify

- `backend/package.json`
  - add the `helmet` dependency if it is not already present
- `backend/src/app.ts`
  - add proxy-aware app setup, security headers, and global body-size limits
- `backend/src/routes/auth.routes.ts`
  - centralize cookie options and make development vs production behavior explicit
- `backend/src/tests/auth.routes.security.test.ts`
  - extend auth security coverage for cookie flags and OAuth state cookie behavior
- `README.md`
  - document same-origin production assumptions, HTTPS requirement, and the new hardening behavior
- `docs/pre-launch-checklist.md`
  - mark or reword the relevant checklist items so they align with the implementation

### New files to create

- `backend/src/tests/app.security.test.ts`
  - verify representative security headers are present on a normal response
- `backend/src/tests/body-limit.test.ts`
  - verify oversized JSON payloads receive `413 Payload Too Large`

---

### Task 1: Add failing backend coverage for security headers and payload limits

**Files:**
- Create: `backend/src/tests/app.security.test.ts`
- Create: `backend/src/tests/body-limit.test.ts`
- Test: `backend/src/tests/app.security.test.ts`
- Test: `backend/src/tests/body-limit.test.ts`

- [ ] **Step 1: Write the failing header test**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

describe("app security headers", () => {
  it("adds representative hardening headers to API responses", async () => {
    const app = createApp();

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["referrer-policy"]).toBeTruthy();
  });
});
```

- [ ] **Step 2: Write the failing body-limit test**

```ts
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";

vi.mock("../repositories/user.repository.js", () => ({
  findUserById: vi.fn().mockResolvedValue({
    id: "user-1",
    email: "kid@example.com",
    public_nickname: "Quiet Fox"
  }),
  updateUserProfile: vi.fn()
}));

vi.mock("../middleware/authenticate.js", async () => {
  const actual = await vi.importActual<object>("../middleware/authenticate.js");
  return {
    ...actual,
    authenticate: (req: any, _res: any, next: any) => {
      req.user = { id: "user-1", email: "kid@example.com" };
      next();
    }
  };
});

describe("request body limits", () => {
  it("rejects oversized JSON payloads", async () => {
    const app = createApp();
    const hugeNickname = "a".repeat(120_000);

    const response = await request(app)
      .patch("/api/users/me/profile")
      .send({ publicNickname: hugeNickname });

    expect(response.status).toBe(413);
  });
});
```

- [ ] **Step 3: Run the new failing tests**

Run:

```bash
npm run test --workspace backend -- src/tests/app.security.test.ts src/tests/body-limit.test.ts
```

Expected:

- `app.security.test.ts` fails because Helmet headers are not present yet
- `body-limit.test.ts` fails because the app does not enforce the tighter JSON limit yet

- [ ] **Step 4: Commit the failing tests**

```bash
git add backend/src/tests/app.security.test.ts backend/src/tests/body-limit.test.ts
git commit -m "test: cover app security headers and body limits"
```

---

### Task 2: Add Helmet and explicit body-size limits to the Express app

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/src/app.ts`
- Test: `backend/src/tests/app.security.test.ts`
- Test: `backend/src/tests/body-limit.test.ts`

- [ ] **Step 1: Add the dependency**

Update `backend/package.json`:

```json
{
  "dependencies": {
    "helmet": "^8.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install --workspace backend
```

Expected:

- `package-lock.json` updates
- `helmet` appears under backend dependencies

- [ ] **Step 3: Add global app hardening**

Update `backend/src/app.ts`:

```ts
import helmet from "helmet";

export const createApp = () => {
  const app = express();

  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );

  app.use(
    cors({
      origin: env.APP_BASE_URL,
      credentials: true
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));

  // existing route registration remains unchanged
};
```

Notes:

- disable custom CSP for now to avoid late-release breakage
- keep the hardening minimal and predictable
- apply the body limits before API routes

- [ ] **Step 4: Run the focused backend tests**

Run:

```bash
npm run test --workspace backend -- src/tests/app.security.test.ts src/tests/body-limit.test.ts
```

Expected:

- both tests pass

- [ ] **Step 5: Commit the app-level hardening**

```bash
git add backend/package.json package-lock.json backend/src/app.ts backend/src/tests/app.security.test.ts backend/src/tests/body-limit.test.ts
git commit -m "feat: harden express security defaults"
```

---

### Task 3: Centralize auth cookie policy and verify production flags

**Files:**
- Modify: `backend/src/routes/auth.routes.ts`
- Modify: `backend/src/tests/auth.routes.security.test.ts`
- Test: `backend/src/tests/auth.routes.security.test.ts`

- [ ] **Step 1: Add the failing cookie tests**

Extend `backend/src/tests/auth.routes.security.test.ts` with cases like:

```ts
it("sets refresh cookies without Secure in development", async () => {
  process.env.NODE_ENV = "development";
  const app = createApp();

  const response = await request(app).post("/api/auth/refresh").set("Cookie", [`${refreshCookieName}=valid-token`]);

  expect(response.headers["set-cookie"]?.join(";")).not.toContain("Secure");
});

it("sets refresh cookies with Secure in production", async () => {
  process.env.NODE_ENV = "production";
  const app = createApp();

  const response = await request(app).post("/api/auth/refresh").set("Cookie", [`${refreshCookieName}=valid-token`]);

  expect(response.headers["set-cookie"]?.join(";")).toContain("Secure");
});

it("sets the oauth state cookie with the same explicit security policy", async () => {
  process.env.NODE_ENV = "production";
  const app = createApp();

  const response = await request(app).get("/api/auth/google");

  expect(response.headers["set-cookie"]?.join(";")).toContain("mathsheets_oauth_state=");
  expect(response.headers["set-cookie"]?.join(";")).toContain("HttpOnly");
  expect(response.headers["set-cookie"]?.join(";")).toContain("Secure");
  expect(response.headers["set-cookie"]?.join(";")).toContain("Path=/api/auth");
});
```

- [ ] **Step 2: Run the auth security suite to confirm it fails**

Run:

```bash
npm run test --workspace backend -- src/tests/auth.routes.security.test.ts
```

Expected:

- at least one new assertion fails because cookie policy is still duplicated inline

- [ ] **Step 3: Centralize cookie options**

Refactor `backend/src/routes/auth.routes.ts`:

```ts
const authCookieBaseOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/api/auth"
};

const clearAuthCookieOptions = {
  path: "/api/auth"
};

res.cookie(oauthStateCookieName, state, authCookieBaseOptions);
res.cookie(refreshCookieName, refreshToken, authCookieBaseOptions);
res.clearCookie(oauthStateCookieName, clearAuthCookieOptions);
res.clearCookie(refreshCookieName, clearAuthCookieOptions);
```

Keep the route behavior unchanged apart from using the shared policy.

- [ ] **Step 4: Re-run auth security tests**

Run:

```bash
npm run test --workspace backend -- src/tests/auth.routes.security.test.ts
```

Expected:

- all cookie-flag assertions pass

- [ ] **Step 5: Commit the cookie hardening**

```bash
git add backend/src/routes/auth.routes.ts backend/src/tests/auth.routes.security.test.ts
git commit -m "feat: centralize auth cookie policy"
```

---

### Task 4: Update release docs for same-origin production hardening

**Files:**
- Modify: `README.md`
- Modify: `docs/pre-launch-checklist.md`

- [ ] **Step 1: Update README deployment guidance**

Add or revise text in `README.md` so it explicitly says:

```md
Production assumptions:

- the current recommended deployment is same-origin
- serve the app over HTTPS
- backend auth cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production
- production frontend builds use `/api` automatically for same-origin deployments
```

- [ ] **Step 2: Update the pre-launch checklist wording**

Adjust `docs/pre-launch-checklist.md` so the relevant items now read more concretely:

```md
- [ ] Verify same-origin production auth cookies work over HTTPS
- [ ] Confirm security headers are present in the deployed app
- [ ] Confirm body-size limits do not break normal worksheet flows
```

- [ ] **Step 3: Review the docs for consistency**

Check both files manually and confirm:

- same-origin wording matches the approved design
- no stale localhost-only implication remains in the production guidance

- [ ] **Step 4: Commit the documentation updates**

```bash
git add README.md docs/pre-launch-checklist.md
git commit -m "docs: describe production hardening assumptions"
```

---

### Task 5: Run final verification and merge-safe checks

**Files:**
- Verify only the files from Tasks 1-4 are included in the implementation work

- [ ] **Step 1: Run the targeted backend verification**

Run:

```bash
npm run test --workspace backend -- src/tests/app.security.test.ts src/tests/body-limit.test.ts src/tests/auth.routes.security.test.ts
```

Expected:

- all targeted tests pass

- [ ] **Step 2: Run the broader backend suite**

Run:

```bash
npm run test --workspace backend
```

Expected:

- full backend suite passes with no regressions

- [ ] **Step 3: Run the frontend build smoke test**

Run:

```bash
npm run build --workspace frontend
```

Expected:

- successful production build

- [ ] **Step 4: Inspect git diff before handoff**

Run:

```bash
git status --short
git diff -- backend/package.json backend/src/app.ts backend/src/routes/auth.routes.ts backend/src/tests/app.security.test.ts backend/src/tests/body-limit.test.ts backend/src/tests/auth.routes.security.test.ts README.md docs/pre-launch-checklist.md
```

Expected:

- only planned hardening files are part of the implementation
- unrelated local edits remain untouched

- [ ] **Step 5: Commit the final verification pass**

```bash
git add backend/package.json package-lock.json backend/src/app.ts backend/src/routes/auth.routes.ts backend/src/tests/app.security.test.ts backend/src/tests/body-limit.test.ts backend/src/tests/auth.routes.security.test.ts README.md docs/pre-launch-checklist.md
git commit -m "test: verify production hardening"
```

---

## Self-review

### Spec coverage

Covered requirements:

- Express security headers: Task 2
- explicit same-origin cookie behavior: Task 3
- request body size limits: Task 2
- proxy-aware production handling: Task 2
- backend tests for headers, cookies, and body limits: Tasks 1 and 3
- documentation alignment: Task 4

No spec gaps found.

### Placeholder scan

Checked for vague placeholders like “add validation later” or “write tests”. All tasks include concrete files, commands, and example code.

### Type consistency

The plan consistently uses:

- `createApp()` for app construction
- `auth.routes.security.test.ts` for auth-cookie coverage
- `express.json({ limit: "100kb" })` and `express.urlencoded({ extended: true, limit: "100kb" })`
- `secure: env.NODE_ENV === "production"` for cookie policy

No naming drift found.
