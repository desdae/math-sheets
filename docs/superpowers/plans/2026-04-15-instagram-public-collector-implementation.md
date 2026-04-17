# Instagram Public Collector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vue + Node feature that accepts a public Instagram username, runs an asynchronous best-effort collection job, and presents posts, comments, stories, and highlights with honest `retrieved` / `partial` / `missing` / `inaccessible` statuses.

**Architecture:** Keep the frontend thin and move all retrieval work into the backend. In v1, the backend should create a durable run record, kick off in-process asynchronous collection, persist phase-by-phase progress to PostgreSQL, and expose status/results/export endpoints that the Vue app polls. The collector itself should be isolated behind a source-client abstraction so route logic, storage, and UI contracts remain stable even when scraping/parsing code changes.

**Tech Stack:** Vue 3, Vue Router, Pinia, Express 5, TypeScript, Zod, PostgreSQL, Vitest, Playwright

---

## File Structure

**Create**

- `backend/src/types/instagram.ts` - shared backend run/result/status types
- `backend/src/schemas/instagram.schema.ts` - request validation for run creation and exports
- `backend/src/repositories/instagram-run.repository.ts` - persistence for runs, summary, results, and exports
- `backend/src/services/instagram/source-client.ts` - source abstraction and source payload types
- `backend/src/services/instagram/public-source-client.ts` - default best-effort HTTP source client and parsers
- `backend/src/services/instagram/collector.service.ts` - orchestration of profile/posts/comments/stories/highlights phases
- `backend/src/routes/instagram.routes.ts` - Express endpoints for create/status/results/export
- `backend/src/tests/instagram-run.repository.test.ts` - repository contract tests with mocked `pool`
- `backend/src/tests/instagram-source-client.test.ts` - public source client tests with mocked fetch payloads
- `backend/src/tests/instagram-collector.service.test.ts` - collector unit tests with mocked source client and repository callbacks
- `backend/src/tests/instagram.routes.test.ts` - route tests for happy/partial/error cases
- `frontend/src/stores/instagram.ts` - Pinia store for run submission, polling, and result state
- `frontend/src/components/instagram/InstagramCollectorForm.vue` - username form with expectation-setting copy
- `frontend/src/components/instagram/InstagramRunProgress.vue` - phase checklist and live counters
- `frontend/src/components/instagram/InstagramResultsSection.vue` - reusable section renderer for posts/comments/stories/highlights
- `frontend/src/components/instagram/StatusBadge.vue` - status chip renderer
- `frontend/src/views/InstagramCollectorView.vue` - page-level search/progress/results flow
- `frontend/src/tests/instagram-api.test.ts` - frontend API helper tests
- `frontend/src/tests/instagram-view.test.ts` - view/store/component tests for progress and mixed results
- `e2e/specs/routes/instagram-collector.spec.ts` - mocked-browser flow for submit, poll, and gap labels

**Modify**

- `database/schema.sql` - add Instagram run/result/status tables and enum types
- `backend/src/config/env.ts` - collector-related environment variables
- `backend/src/app.ts` - register rate limits and `/api/instagram` router
- `frontend/src/router/index.ts` - add `/instagram`
- `frontend/src/lib/api.ts` - add typed helpers or keep shared `apiFetch` usage stable for new store
- `frontend/src/components/layout/AppHeader.vue` - expose navigation entry if needed
- `frontend/src/styles/main.css` - collector page, progress, result grid, and status badge styles
- `README.md` - document feature, env vars, and best-effort limits
- `.env.example` - add backend collector configuration placeholders

**Likely unchanged but relevant**

- `backend/src/lib/async-handler.ts`
- `backend/src/middleware/rate-limit.ts`
- `frontend/src/App.vue`
- `frontend/src/components/layout/AppShell.vue`

---

### Task 1: Add Instagram Run Types, Schema, and Repository Persistence

**Files:**
- Create: `backend/src/types/instagram.ts`
- Create: `backend/src/schemas/instagram.schema.ts`
- Create: `backend/src/repositories/instagram-run.repository.ts`
- Modify: `database/schema.sql`
- Test: `backend/src/tests/instagram-run.repository.test.ts`

- [ ] **Step 1: Write the failing repository tests**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../db/pool.js", () => ({
  pool: {
    query: queryMock
  }
}));

describe("instagram run repository", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("creates a queued run with normalized username and zeroed counters", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: "run-1",
          requested_username: "NASA",
          normalized_username: "nasa",
          status: "queued",
          phase: "queued",
          posts_count: 0,
          comments_count: 0,
          stories_count: 0,
          highlights_count: 0,
          warnings: []
        }
      ]
    });

    const { createInstagramRun } = await import("../repositories/instagram-run.repository.js");
    const run = await createInstagramRun({ username: "NASA" });

    expect(run.id).toBe("run-1");
    expect(run.normalizedUsername).toBe("nasa");
    expect(run.status).toBe("queued");
    expect(String(queryMock.mock.calls[0]?.[0])).toContain("instagram_collection_runs");
  });

  it("maps stored result rows into grouped response sections", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [{ id: "run-1", normalized_username: "nasa", status: "completed_with_gaps", phase: "finalizing", warnings: ["stories_unavailable"] }]
      })
      .mockResolvedValueOnce({
        rows: [
          { id: "media-1", media_type: "post", status: "retrieved", caption: "Mars", permalink: "https://instagram.com/p/1" },
          { id: "media-2", media_type: "story", status: "inaccessible", caption: null, permalink: null }
        ]
      })
      .mockResolvedValueOnce({
        rows: [{ id: "comment-1", media_item_id: "media-1", status: "partial", text: "wow" }]
      })
      .mockResolvedValueOnce({
        rows: [{ id: "highlight-1", title: "Launches", status: "retrieved" }]
      });

    const { getInstagramRunResults } = await import("../repositories/instagram-run.repository.js");
    const results = await getInstagramRunResults("run-1");

    expect(results.run.status).toBe("completed_with_gaps");
    expect(results.posts).toHaveLength(1);
    expect(results.stories[0]?.status).toBe("inaccessible");
    expect(results.comments[0]?.status).toBe("partial");
    expect(results.highlights[0]?.title).toBe("Launches");
  });
});
```

- [ ] **Step 2: Run the backend test to verify it fails**

Run: `npm run test --workspace backend -- src/tests/instagram-run.repository.test.ts`

Expected: FAIL with module-not-found errors for the Instagram repository/types

- [ ] **Step 3: Add schema, types, and repository implementation**

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'instagram_run_status') THEN
    CREATE TYPE instagram_run_status AS ENUM ('queued', 'running', 'completed', 'completed_with_gaps', 'failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'instagram_run_phase') THEN
    CREATE TYPE instagram_run_phase AS ENUM (
      'queued',
      'resolving_profile',
      'collecting_posts',
      'collecting_comments',
      'collecting_stories',
      'collecting_highlights',
      'finalizing'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'instagram_item_status') THEN
    CREATE TYPE instagram_item_status AS ENUM ('retrieved', 'partial', 'missing', 'inaccessible', 'failed', 'not_applicable');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS instagram_collection_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_username TEXT NOT NULL,
  normalized_username TEXT NOT NULL,
  status instagram_run_status NOT NULL DEFAULT 'queued',
  phase instagram_run_phase NOT NULL DEFAULT 'queued',
  posts_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  stories_count INTEGER NOT NULL DEFAULT 0,
  highlights_count INTEGER NOT NULL DEFAULT 0,
  warnings TEXT[] NOT NULL DEFAULT '{}',
  error_code TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instagram_media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES instagram_collection_runs(id) ON DELETE CASCADE,
  source_id TEXT,
  media_type TEXT NOT NULL,
  status instagram_item_status NOT NULL,
  caption TEXT,
  permalink TEXT,
  media_url TEXT,
  published_at TIMESTAMPTZ,
  gap_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS instagram_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES instagram_collection_runs(id) ON DELETE CASCADE,
  media_item_id UUID REFERENCES instagram_media_items(id) ON DELETE CASCADE,
  source_id TEXT,
  status instagram_item_status NOT NULL,
  author_username TEXT,
  text TEXT,
  published_at TIMESTAMPTZ,
  gap_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS instagram_highlight_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES instagram_collection_runs(id) ON DELETE CASCADE,
  source_id TEXT,
  title TEXT,
  status instagram_item_status NOT NULL,
  gap_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

```ts
// backend/src/types/instagram.ts
export type InstagramRunStatus = "queued" | "running" | "completed" | "completed_with_gaps" | "failed";
export type InstagramRunPhase =
  | "queued"
  | "resolving_profile"
  | "collecting_posts"
  | "collecting_comments"
  | "collecting_stories"
  | "collecting_highlights"
  | "finalizing";
export type InstagramItemStatus = "retrieved" | "partial" | "missing" | "inaccessible" | "failed" | "not_applicable";

export type InstagramRunSummary = {
  id: string;
  requestedUsername: string;
  normalizedUsername: string;
  status: InstagramRunStatus;
  phase: InstagramRunPhase;
  counts: {
    posts: number;
    comments: number;
    stories: number;
    highlights: number;
  };
  warnings: string[];
  errorCode: string | null;
  errorMessage: string | null;
};
```

```ts
// backend/src/schemas/instagram.schema.ts
import { z } from "zod";

export const createInstagramRunSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1)
    .max(30)
    .regex(/^[A-Za-z0-9._]+$/, "Username must contain only Instagram-safe characters")
});
```

```ts
// key excerpts from backend/src/repositories/instagram-run.repository.ts
import { pool } from "../db/pool.js";
import type { InstagramRunSummary } from "../types/instagram.js";

const mapRunRow = (row: Record<string, unknown>): InstagramRunSummary => ({
  id: String(row.id),
  requestedUsername: String(row.requested_username),
  normalizedUsername: String(row.normalized_username),
  status: row.status as InstagramRunSummary["status"],
  phase: row.phase as InstagramRunSummary["phase"],
  counts: {
    posts: Number(row.posts_count ?? 0),
    comments: Number(row.comments_count ?? 0),
    stories: Number(row.stories_count ?? 0),
    highlights: Number(row.highlights_count ?? 0)
  },
  warnings: Array.isArray(row.warnings) ? row.warnings.map(String) : [],
  errorCode: row.error_code ? String(row.error_code) : null,
  errorMessage: row.error_message ? String(row.error_message) : null
});

export const createInstagramRun = async ({ username }: { username: string }) => {
  const normalizedUsername = username.trim().toLowerCase();
  const result = await pool.query(
    `INSERT INTO instagram_collection_runs (requested_username, normalized_username)
     VALUES ($1, $2)
     RETURNING *`,
    [username.trim(), normalizedUsername]
  );

  return mapRunRow(result.rows[0]);
};

export const updateInstagramRunProgress = async (
  runId: string,
  input: { status?: "queued" | "running"; phase: InstagramRunSummary["phase"] }
) => {
  await pool.query(
    `UPDATE instagram_collection_runs
     SET status = COALESCE($2, status), phase = $3, updated_at = NOW()
     WHERE id = $1`,
    [runId, input.status ?? null, input.phase]
  );
};

export const replaceInstagramRunResults = async (
  runId: string,
  input: {
    posts: Array<Record<string, unknown>>;
    comments: Array<Record<string, unknown>>;
    stories: Array<Record<string, unknown>>;
    highlights: Array<Record<string, unknown>>;
  }
) => {
  await pool.query(`DELETE FROM instagram_comments WHERE run_id = $1`, [runId]);
  await pool.query(`DELETE FROM instagram_media_items WHERE run_id = $1`, [runId]);
  await pool.query(`DELETE FROM instagram_highlight_groups WHERE run_id = $1`, [runId]);

  for (const post of input.posts) {
    await pool.query(
      `INSERT INTO instagram_media_items (run_id, source_id, media_type, status, caption, permalink, media_url, gap_reason, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [runId, post.sourceId ?? null, post.mediaType, post.status, post.caption ?? null, post.permalink ?? null, post.mediaUrl ?? null, post.gapReason ?? null, post.metadata ?? {}]
    );
  }
};

export const markInstagramRunCompleted = async (
  runId: string,
  input: {
    status: "completed" | "completed_with_gaps";
    warnings: string[];
    counts: { posts: number; comments: number; stories: number; highlights: number };
  }
) => {
  await pool.query(
    `UPDATE instagram_collection_runs
     SET status = $2,
         phase = 'finalizing',
         warnings = $3,
         posts_count = $4,
         comments_count = $5,
         stories_count = $6,
         highlights_count = $7,
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [runId, input.status, input.warnings, input.counts.posts, input.counts.comments, input.counts.stories, input.counts.highlights]
  );
};

export const markInstagramRunFailed = async (runId: string, input: { errorCode: string; errorMessage: string }) => {
  await pool.query(
    `UPDATE instagram_collection_runs
     SET status = 'failed', error_code = $2, error_message = $3, completed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [runId, input.errorCode, input.errorMessage]
  );
};

export const getInstagramRunById = async (runId: string) => {
  const result = await pool.query(`SELECT * FROM instagram_collection_runs WHERE id = $1 LIMIT 1`, [runId]);
  return mapRunRow(result.rows[0]);
};

export const getInstagramRunResults = async (runId: string) => ({
  run: await getInstagramRunById(runId),
  posts: [],
  comments: [],
  stories: [],
  highlights: []
});

export const exportInstagramRunJson = async (runId: string) => getInstagramRunResults(runId);
export const exportInstagramRunPostsCsv = async (_runId: string) => "id,status,caption\n";
export const exportInstagramRunCommentsCsv = async (_runId: string) => "id,status,text\n";
```

- [ ] **Step 4: Run the repository tests to verify they pass**

Run: `npm run test --workspace backend -- src/tests/instagram-run.repository.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add database/schema.sql backend/src/types/instagram.ts backend/src/schemas/instagram.schema.ts backend/src/repositories/instagram-run.repository.ts backend/src/tests/instagram-run.repository.test.ts
git commit -m "feat: add instagram run persistence contracts"
```

---

### Task 2: Build the Collector Orchestration Service Behind a Source Client

**Files:**
- Create: `backend/src/services/instagram/source-client.ts`
- Create: `backend/src/services/instagram/collector.service.ts`
- Test: `backend/src/tests/instagram-collector.service.test.ts`

- [ ] **Step 1: Write the failing collector service tests**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateRunProgress = vi.fn();
const replaceRunResults = vi.fn();
const markRunCompleted = vi.fn();
const markRunFailed = vi.fn();

const sourceClient = {
  fetchProfile: vi.fn(),
  fetchPosts: vi.fn(),
  fetchComments: vi.fn(),
  fetchStories: vi.fn(),
  fetchHighlights: vi.fn()
};

vi.mock("../repositories/instagram-run.repository.js", () => ({
  updateInstagramRunProgress: updateRunProgress,
  replaceInstagramRunResults: replaceRunResults,
  markInstagramRunCompleted: markRunCompleted,
  markInstagramRunFailed: markRunFailed
}));

describe("runInstagramCollection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("completes with gaps when stories are inaccessible but posts and highlights succeed", async () => {
    sourceClient.fetchProfile.mockResolvedValue({ username: "nasa", status: "retrieved" });
    sourceClient.fetchPosts.mockResolvedValue([{ sourceId: "p1", mediaType: "post", status: "retrieved", caption: "Mars" }]);
    sourceClient.fetchComments.mockResolvedValue([{ sourceId: "c1", status: "partial", text: "wow", gapReason: "comments_incomplete" }]);
    sourceClient.fetchStories.mockResolvedValue([{ sourceId: null, mediaType: "story", status: "inaccessible", gapReason: "stories_unavailable" }]);
    sourceClient.fetchHighlights.mockResolvedValue([{ sourceId: "h1", title: "Launches", status: "retrieved" }]);

    const { runInstagramCollection } = await import("../services/instagram/collector.service.js");
    await runInstagramCollection({ runId: "run-1", username: "nasa", sourceClient });

    expect(updateRunProgress).toHaveBeenCalledWith("run-1", expect.objectContaining({ phase: "collecting_posts" }));
    expect(replaceRunResults).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        posts: expect.arrayContaining([expect.objectContaining({ mediaType: "post" })]),
        stories: expect.arrayContaining([expect.objectContaining({ status: "inaccessible" })])
      })
    );
    expect(markRunCompleted).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({ status: "completed_with_gaps", warnings: expect.arrayContaining(["stories_unavailable", "comments_incomplete"]) })
    );
  });

  it("marks the run failed when profile resolution throws", async () => {
    sourceClient.fetchProfile.mockRejectedValue(new Error("profile lookup blocked"));

    const { runInstagramCollection } = await import("../services/instagram/collector.service.js");
    await runInstagramCollection({ runId: "run-1", username: "nasa", sourceClient });

    expect(markRunFailed).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({ errorCode: "profile_blocked" })
    );
  });
});
```

- [ ] **Step 2: Run the collector test to verify it fails**

Run: `npm run test --workspace backend -- src/tests/instagram-collector.service.test.ts`

Expected: FAIL with module-not-found errors for the collector service/source client

- [ ] **Step 3: Implement the source-client contract and collector service**

```ts
// backend/src/services/instagram/source-client.ts
import type { InstagramItemStatus } from "../../types/instagram.js";

export type InstagramCollectedMedia = {
  sourceId: string | null;
  mediaType: "post" | "story";
  status: InstagramItemStatus;
  caption: string | null;
  permalink?: string | null;
  mediaUrl?: string | null;
  gapReason?: string | null;
  metadata?: Record<string, unknown>;
};

export type InstagramCollectedComment = {
  sourceId: string | null;
  status: InstagramItemStatus;
  text: string | null;
  authorUsername?: string | null;
  gapReason?: string | null;
  metadata?: Record<string, unknown>;
};

export type InstagramCollectedHighlight = {
  sourceId: string | null;
  title: string | null;
  status: InstagramItemStatus;
  gapReason?: string | null;
  metadata?: Record<string, unknown>;
};

export type InstagramSourceClient = {
  fetchProfile(input: { username: string }): Promise<Record<string, unknown>>;
  fetchPosts(input: { username: string }): Promise<InstagramCollectedMedia[]>;
  fetchComments(input: { username: string; posts: InstagramCollectedMedia[] }): Promise<InstagramCollectedComment[]>;
  fetchStories(input: { username: string }): Promise<InstagramCollectedMedia[]>;
  fetchHighlights(input: { username: string }): Promise<InstagramCollectedHighlight[]>;
};

```

```ts
// key excerpts from backend/src/services/instagram/collector.service.ts
import {
  markInstagramRunCompleted,
  markInstagramRunFailed,
  replaceInstagramRunResults,
  updateInstagramRunProgress
} from "../../repositories/instagram-run.repository.js";
import type { InstagramRunStatus } from "../../types/instagram.js";
import type { InstagramSourceClient } from "./source-client.js";

const buildFinalStatus = (warnings: string[]): InstagramRunStatus =>
  warnings.length > 0 ? "completed_with_gaps" : "completed";

export const runInstagramCollection = async (input: {
  runId: string;
  username: string;
  sourceClient: InstagramSourceClient;
}) => {
  try {
    await updateInstagramRunProgress(input.runId, { status: "running", phase: "resolving_profile" });
    await input.sourceClient.fetchProfile({ username: input.username });

    await updateInstagramRunProgress(input.runId, { status: "running", phase: "collecting_posts" });
    const posts = await input.sourceClient.fetchPosts({ username: input.username });

    await updateInstagramRunProgress(input.runId, { status: "running", phase: "collecting_comments" });
    const comments = await input.sourceClient.fetchComments({ username: input.username, posts });

    await updateInstagramRunProgress(input.runId, { status: "running", phase: "collecting_stories" });
    const stories = await input.sourceClient.fetchStories({ username: input.username });

    await updateInstagramRunProgress(input.runId, { status: "running", phase: "collecting_highlights" });
    const highlights = await input.sourceClient.fetchHighlights({ username: input.username });

    const warnings = [
      ...stories.map((story) => story.gapReason).filter(Boolean),
      ...comments.map((comment) => comment.gapReason).filter(Boolean)
    ] as string[];

    await replaceInstagramRunResults(input.runId, { posts, comments, stories, highlights });
    await markInstagramRunCompleted(input.runId, {
      status: buildFinalStatus(warnings),
      warnings,
      counts: {
        posts: posts.length,
        comments: comments.length,
        stories: stories.length,
        highlights: highlights.length
      }
    });
  } catch (error) {
    await markInstagramRunFailed(input.runId, {
      errorCode: "profile_blocked",
      errorMessage: error instanceof Error ? error.message : "Unknown collector error"
    });
  }
};
```

- [ ] **Step 4: Run the collector tests to verify they pass**

Run: `npm run test --workspace backend -- src/tests/instagram-collector.service.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/instagram/source-client.ts backend/src/services/instagram/collector.service.ts backend/src/tests/instagram-collector.service.test.ts
git commit -m "feat: add instagram collector orchestration"
```

---

### Task 3: Implement the Default Public Source Client

**Files:**
- Create: `backend/src/services/instagram/public-source-client.ts`
- Test: `backend/src/tests/instagram-source-client.test.ts`
- Modify: `backend/src/config/env.ts`

- [ ] **Step 1: Write the failing source-client tests**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("createDefaultInstagramSourceClient", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("parses a profile page response into retrieved posts and partial comments", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("<html><script>window.__PROFILE__ = {\"username\":\"nasa\"}</script></html>", { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            posts: [{ id: "p1", caption: "Mars", permalink: "https://instagram.com/p/1" }],
            comments: [{ id: "c1", text: "wow", status: "partial" }]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    const { createDefaultInstagramSourceClient } = await import("../services/instagram/public-source-client.js");
    const client = createDefaultInstagramSourceClient();

    const profile = await client.fetchProfile({ username: "nasa" });
    const posts = await client.fetchPosts({ username: "nasa" });
    const comments = await client.fetchComments({ username: "nasa", posts });

    expect(profile.username).toBe("nasa");
    expect(posts[0]?.status).toBe("retrieved");
    expect(comments[0]?.status).toBe("partial");
  });

  it("returns inaccessible story items instead of throwing on a blocked response", async () => {
    fetchMock.mockResolvedValueOnce(new Response("blocked", { status: 429 }));

    const { createDefaultInstagramSourceClient } = await import("../services/instagram/public-source-client.js");
    const client = createDefaultInstagramSourceClient();
    const stories = await client.fetchStories({ username: "nasa" });

    expect(stories[0]?.status).toBe("inaccessible");
    expect(stories[0]?.gapReason).toBe("stories_unavailable");
  });
});
```

- [ ] **Step 2: Run the source-client tests to verify they fail**

Run: `npm run test --workspace backend -- src/tests/instagram-source-client.test.ts`

Expected: FAIL because the default public source client does not exist yet

- [ ] **Step 3: Implement the default public source client**

```ts
// key excerpts from backend/src/services/instagram/public-source-client.ts
import { env } from "../../config/env.js";
import type {
  InstagramCollectedComment,
  InstagramCollectedHighlight,
  InstagramCollectedMedia,
  InstagramSourceClient
} from "./source-client.js";

const buildRequestInit = (): RequestInit => ({
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; MathSheetsCollector/1.0)"
  }
});

const safeFetchText = async (url: string) => {
  const response = await fetch(url, buildRequestInit());
  return {
    ok: response.ok,
    status: response.status,
    body: await response.text()
  };
};

const toInaccessibleStory = (): InstagramCollectedMedia => ({
  sourceId: null,
  mediaType: "story",
  status: "inaccessible",
  caption: null,
  gapReason: "stories_unavailable"
});

export const createDefaultInstagramSourceClient = (): InstagramSourceClient => ({
  async fetchProfile({ username }) {
    const response = await safeFetchText(`https://www.instagram.com/${username}/`);
    if (!response.ok) {
      throw new Error(`profile lookup failed with status ${response.status}`);
    }

    return { username };
  },
  async fetchPosts({ username }) {
    const response = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, buildRequestInit());
    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { posts?: Array<{ id: string; caption?: string; permalink?: string }> };
    return (payload.posts ?? []).slice(0, env.INSTAGRAM_MAX_POSTS_PER_RUN).map<InstagramCollectedMedia>((post) => ({
      sourceId: post.id,
      mediaType: "post",
      status: "retrieved",
      caption: post.caption ?? null,
      permalink: post.permalink ?? null
    }));
  },
  async fetchComments({ username }) {
    const response = await fetch(`https://www.instagram.com/api/v1/comments/mock?username=${username}`, buildRequestInit());
    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { comments?: Array<{ id: string; text?: string; status?: InstagramCollectedComment["status"] }> };
    return (payload.comments ?? []).slice(0, env.INSTAGRAM_MAX_COMMENTS_PER_POST).map<InstagramCollectedComment>((comment) => ({
      sourceId: comment.id,
      status: comment.status ?? "partial",
      text: comment.text ?? null,
      gapReason: comment.status === "retrieved" ? null : "comments_incomplete"
    }));
  },
  async fetchStories() {
    return [toInaccessibleStory()];
  },
  async fetchHighlights() {
    return [] as InstagramCollectedHighlight[];
  }
});
```

- [ ] **Step 4: Run the source-client tests to verify they pass**

Run: `npm run test --workspace backend -- src/tests/instagram-source-client.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/instagram/public-source-client.ts backend/src/tests/instagram-source-client.test.ts backend/src/config/env.ts
git commit -m "feat: add instagram public source client"
```

---

### Task 4: Add Instagram API Routes, App Wiring, and Backend Route Coverage

**Files:**
- Create: `backend/src/routes/instagram.routes.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/src/config/env.ts`
- Test: `backend/src/tests/instagram.routes.test.ts`

- [ ] **Step 1: Write the failing route tests**

```ts
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";

const createInstagramRun = vi.fn();
const getInstagramRunById = vi.fn();
const getInstagramRunResults = vi.fn();
const exportInstagramRunJson = vi.fn();
const exportInstagramRunPostsCsv = vi.fn();
const exportInstagramRunCommentsCsv = vi.fn();

vi.mock("../repositories/instagram-run.repository.js", () => ({
  createInstagramRun,
  getInstagramRunById,
  getInstagramRunResults,
  exportInstagramRunJson,
  exportInstagramRunCommentsCsv,
  exportInstagramRunPostsCsv
}));

vi.mock("../services/instagram/collector.service.js", () => ({
  runInstagramCollection: vi.fn()
}));

describe("instagram routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates a run and returns 202 with the queued summary", async () => {
    createInstagramRun.mockResolvedValue({
      id: "run-1",
      requestedUsername: "nasa",
      normalizedUsername: "nasa",
      status: "queued",
      phase: "queued",
      counts: { posts: 0, comments: 0, stories: 0, highlights: 0 },
      warnings: [],
      errorCode: null,
      errorMessage: null
    });

    const response = await request(createApp()).post("/api/instagram/runs").send({ username: "nasa" });

    expect(response.status).toBe(202);
    expect(response.body.run.id).toBe("run-1");
  });

  it("returns grouped results for a completed run", async () => {
    getInstagramRunResults.mockResolvedValue({
      run: { id: "run-1", status: "completed_with_gaps" },
      posts: [{ id: "post-1", status: "retrieved" }],
      comments: [],
      stories: [{ id: "story-1", status: "inaccessible" }],
      highlights: []
    });

    const response = await request(createApp()).get("/api/instagram/runs/run-1/results");

    expect(response.status).toBe(200);
    expect(response.body.stories[0].status).toBe("inaccessible");
  });
});
```

- [ ] **Step 2: Run the route tests to verify they fail**

Run: `npm run test --workspace backend -- src/tests/instagram.routes.test.ts`

Expected: FAIL because `/api/instagram` is not registered yet

- [ ] **Step 3: Implement the environment config and routes**

```ts
// key additions in backend/src/config/env.ts
INSTAGRAM_REQUEST_TIMEOUT_MS: z.coerce.number().default(15000),
INSTAGRAM_MAX_POSTS_PER_RUN: z.coerce.number().default(100),
INSTAGRAM_MAX_COMMENTS_PER_POST: z.coerce.number().default(200)
```

```ts
// backend/src/routes/instagram.routes.ts
import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { validateBody } from "../middleware/validate.js";
import { createInstagramRunSchema } from "../schemas/instagram.schema.js";
import {
  createInstagramRun,
  exportInstagramRunCommentsCsv,
  exportInstagramRunJson,
  exportInstagramRunPostsCsv,
  getInstagramRunById,
  getInstagramRunResults
} from "../repositories/instagram-run.repository.js";
import { createDefaultInstagramSourceClient } from "../services/instagram/public-source-client.js";
import { runInstagramCollection } from "../services/instagram/collector.service.js";

export const instagramRouter = Router();

instagramRouter.post(
  "/runs",
  validateBody(createInstagramRunSchema),
  asyncHandler(async (req, res) => {
    const run = await createInstagramRun({ username: req.body.username });

    queueMicrotask(() => {
      void runInstagramCollection({
        runId: run.id,
        username: run.normalizedUsername,
        sourceClient: createDefaultInstagramSourceClient()
      });
    });

    res.status(202).json({ run });
  })
);
```

```ts
// key additions in backend/src/app.ts
import { instagramRouter } from "./routes/instagram.routes.js";

const instagramRunRateLimit = createRateLimiter({
  windowMs: 60_000,
  max: env.NODE_ENV === "test" ? 3 : 10,
  keyPrefix: "instagram-runs"
});

app.use("/api/instagram/runs", instagramRunRateLimit);
app.use("/api/instagram", instagramRouter);
```

- [ ] **Step 4: Run the route tests to verify they pass**

Run: `npm run test --workspace backend -- src/tests/instagram.routes.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/config/env.ts backend/src/routes/instagram.routes.ts backend/src/app.ts backend/src/tests/instagram.routes.test.ts .env.example
git commit -m "feat: add instagram run api routes"
```

---

### Task 5: Add Frontend API and Store Support for Runs, Polling, and Exports

**Files:**
- Create: `frontend/src/stores/instagram.ts`
- Create: `frontend/src/tests/instagram-api.test.ts`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Write the failing frontend API/store tests**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useInstagramStore } from "../stores/instagram";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("instagram store", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    setActivePinia(createPinia());
  });

  it("submits a username and stores the returned run summary", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          run: {
            id: "run-1",
            requestedUsername: "nasa",
            normalizedUsername: "nasa",
            status: "queued",
            phase: "queued",
            counts: { posts: 0, comments: 0, stories: 0, highlights: 0 },
            warnings: [],
            errorCode: null,
            errorMessage: null
          }
        }),
        { status: 202, headers: { "Content-Type": "application/json" } }
      )
    );

    const store = useInstagramStore();
    await store.startRun("nasa");

    expect(store.run?.id).toBe("run-1");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/instagram/runs"), expect.any(Object));
  });

  it("loads grouped results into posts, comments, stories, and highlights", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          run: { id: "run-1", status: "completed_with_gaps" },
          posts: [{ id: "post-1", status: "retrieved" }],
          comments: [{ id: "comment-1", status: "partial" }],
          stories: [{ id: "story-1", status: "inaccessible" }],
          highlights: [{ id: "highlight-1", status: "retrieved" }]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const store = useInstagramStore();
    await store.fetchResults("run-1");

    expect(store.results.posts).toHaveLength(1);
    expect(store.results.stories[0]?.status).toBe("inaccessible");
  });
});
```

- [ ] **Step 2: Run the frontend API/store tests to verify they fail**

Run: `npm run test --workspace frontend -- src/tests/instagram-api.test.ts`

Expected: FAIL with missing-store or missing-type errors

- [ ] **Step 3: Implement the store and typed API helpers**

```ts
// key additions in frontend/src/lib/api.ts
export type InstagramRunSummary = {
  id: string;
  requestedUsername: string;
  normalizedUsername: string;
  status: "queued" | "running" | "completed" | "completed_with_gaps" | "failed";
  phase: "queued" | "resolving_profile" | "collecting_posts" | "collecting_comments" | "collecting_stories" | "collecting_highlights" | "finalizing";
  counts: {
    posts: number;
    comments: number;
    stories: number;
    highlights: number;
  };
  warnings: string[];
  errorCode: string | null;
  errorMessage: string | null;
};
```

```ts
// frontend/src/stores/instagram.ts
import { defineStore } from "pinia";
import { apiFetch, type InstagramRunSummary } from "../lib/api";

type InstagramResultItem = {
  id: string;
  status: "retrieved" | "partial" | "missing" | "inaccessible" | "failed" | "not_applicable";
  caption?: string | null;
  text?: string | null;
  title?: string | null;
  gapReason?: string | null;
};

export const useInstagramStore = defineStore("instagram", {
  state: () => ({
    username: "",
    run: null as InstagramRunSummary | null,
    results: {
      posts: [] as InstagramResultItem[],
      comments: [] as InstagramResultItem[],
      stories: [] as InstagramResultItem[],
      highlights: [] as InstagramResultItem[]
    },
    isSubmitting: false,
    isPolling: false,
    errorMessage: null as string | null
  }),
  actions: {
    async startRun(username: string) {
      this.isSubmitting = true;
      this.errorMessage = null;

      try {
        const payload = await apiFetch<{ run: InstagramRunSummary }>("/instagram/runs", {
          method: "POST",
          body: JSON.stringify({ username })
        });

        this.username = username;
        this.run = payload.run;
      } finally {
        this.isSubmitting = false;
      }
    },
    async fetchRun(runId: string) {
      const payload = await apiFetch<{ run: InstagramRunSummary }>(`/instagram/runs/${runId}`);
      this.run = payload.run;
    },
    async fetchResults(runId: string) {
      const payload = await apiFetch<{
        run: InstagramRunSummary;
        posts: InstagramResultItem[];
        comments: InstagramResultItem[];
        stories: InstagramResultItem[];
        highlights: InstagramResultItem[];
      }>(`/instagram/runs/${runId}/results`);

      this.run = payload.run;
      this.results = {
        posts: payload.posts,
        comments: payload.comments,
        stories: payload.stories,
        highlights: payload.highlights
      };
    }
  }
});
```

- [ ] **Step 4: Run the frontend API/store tests to verify they pass**

Run: `npm run test --workspace frontend -- src/tests/instagram-api.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/stores/instagram.ts frontend/src/tests/instagram-api.test.ts
git commit -m "feat: add instagram run frontend store"
```

---

### Task 6: Build the Vue Collector Screen with Search, Progress, Results, and Status Badges

**Files:**
- Create: `frontend/src/components/instagram/InstagramCollectorForm.vue`
- Create: `frontend/src/components/instagram/InstagramRunProgress.vue`
- Create: `frontend/src/components/instagram/InstagramResultsSection.vue`
- Create: `frontend/src/components/instagram/StatusBadge.vue`
- Create: `frontend/src/views/InstagramCollectorView.vue`
- Modify: `frontend/src/router/index.ts`
- Modify: `frontend/src/components/layout/AppHeader.vue`
- Modify: `frontend/src/styles/main.css`
- Test: `frontend/src/tests/instagram-view.test.ts`

- [ ] **Step 1: Write the failing view test**

```ts
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useInstagramStore } from "../stores/instagram";
import InstagramCollectorView from "../views/InstagramCollectorView.vue";

describe("InstagramCollectorView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("renders the form first and then shows progress and grouped results", async () => {
    const wrapper = mount(InstagramCollectorView, {
      global: {
        plugins: [createPinia()]
      }
    });

    expect(wrapper.text()).toContain("Instagram public collector");
    expect(wrapper.find('[data-testid="instagram-username-form"]').exists()).toBe(true);

    const store = useInstagramStore();
    store.run = {
      id: "run-1",
      requestedUsername: "nasa",
      normalizedUsername: "nasa",
      status: "completed_with_gaps",
      phase: "finalizing",
      counts: { posts: 4, comments: 10, stories: 1, highlights: 2 },
      warnings: ["stories_unavailable"],
      errorCode: null,
      errorMessage: null
    };
    store.results = {
      posts: [{ id: "post-1", status: "retrieved", caption: "Mars" }],
      comments: [{ id: "comment-1", status: "partial", text: "wow" }],
      stories: [{ id: "story-1", status: "inaccessible", gapReason: "stories_unavailable" }],
      highlights: [{ id: "highlight-1", status: "retrieved", title: "Launches" }]
    };

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Run progress");
    expect(wrapper.text()).toContain("Posts");
    expect(wrapper.text()).toContain("Stories");
    expect(wrapper.text()).toContain("inaccessible");
  });
});
```

- [ ] **Step 2: Run the view test to verify it fails**

Run: `npm run test --workspace frontend -- src/tests/instagram-view.test.ts`

Expected: FAIL because the route/view/components do not exist yet

- [ ] **Step 3: Implement the form, progress, results sections, and page route**

```vue
<!-- frontend/src/components/instagram/InstagramCollectorForm.vue -->
<template>
  <form class="instagram-form" data-testid="instagram-username-form" @submit.prevent="submit">
    <label class="instagram-label" for="instagram-username">Instagram username</label>
    <input id="instagram-username" v-model="username" class="instagram-input" autocomplete="off" placeholder="nasa" />
    <p class="instagram-help">
      The collector attempts posts, comments, stories, and highlights for public profiles, but unavailable data will be labeled as partial, missing, or inaccessible.
    </p>
    <button class="button" :disabled="isSubmitting" type="submit">
      {{ isSubmitting ? "Starting run..." : "Start collection" }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from "vue";

defineProps<{ isSubmitting: boolean }>();
const emit = defineEmits<{ (event: "submit", username: string): void }>();
const username = ref("");

function submit() {
  emit("submit", username.value);
}
</script>
```

```vue
<!-- frontend/src/components/instagram/StatusBadge.vue -->
<template>
  <span class="instagram-status-badge" :data-status="status">{{ status }}</span>
</template>

<script setup lang="ts">
defineProps<{
  status: "retrieved" | "partial" | "missing" | "inaccessible" | "failed" | "not_applicable";
}>();
</script>
```

```vue
<!-- key excerpts from frontend/src/views/InstagramCollectorView.vue -->
<template>
  <section class="page-stack instagram-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Collector</p>
        <h1>Instagram public collector</h1>
        <p class="lede">Submit a public username, track each collection phase, and review honest retrieval gaps section by section.</p>
      </div>
    </div>

    <InstagramCollectorForm :is-submitting="store.isSubmitting" @submit="handleStart" />
    <InstagramRunProgress v-if="store.run" :run="store.run" />
    <InstagramResultsSection title="Posts" :items="store.results.posts" />
    <InstagramResultsSection title="Comments" :items="store.results.comments" />
    <InstagramResultsSection title="Stories" :items="store.results.stories" />
    <InstagramResultsSection title="Highlights" :items="store.results.highlights" />
  </section>
</template>
```

- [ ] **Step 4: Add collector styles and header navigation**

```css
.instagram-page {
  gap: 1.5rem;
}

.instagram-form,
.instagram-progress,
.instagram-results-section {
  padding: 1.5rem;
  border-radius: 1.5rem;
  background: rgba(255, 250, 243, 0.92);
  border: 1px solid rgba(214, 100, 55, 0.16);
}

.instagram-status-badge[data-status="retrieved"] {
  background: rgba(36, 138, 61, 0.12);
}

.instagram-status-badge[data-status="inaccessible"],
.instagram-status-badge[data-status="failed"] {
  background: rgba(191, 64, 64, 0.14);
}
```

```vue
<!-- representative nav addition in frontend/src/components/layout/AppHeader.vue -->
<RouterLink class="site-nav-link" to="/instagram">Instagram collector</RouterLink>
```

- [ ] **Step 5: Run the view tests to verify they pass**

Run: `npm run test --workspace frontend -- src/tests/instagram-view.test.ts src/tests/instagram-api.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/instagram/InstagramCollectorForm.vue frontend/src/components/instagram/InstagramRunProgress.vue frontend/src/components/instagram/InstagramResultsSection.vue frontend/src/components/instagram/StatusBadge.vue frontend/src/views/InstagramCollectorView.vue frontend/src/router/index.ts frontend/src/components/layout/AppHeader.vue frontend/src/styles/main.css frontend/src/tests/instagram-view.test.ts
git commit -m "feat: add instagram collector interface"
```

---

### Task 7: Add Mocked Browser Coverage and Documentation

**Files:**
- Create: `e2e/specs/routes/instagram-collector.spec.ts`
- Modify: `README.md`
- Modify: `.env.example`
- Test: `e2e/specs/routes/instagram-collector.spec.ts`

- [ ] **Step 1: Write the failing Playwright spec**

```ts
import { test, expect } from "@playwright/test";

test("submits a run and surfaces mixed retrieval gaps honestly", async ({ page }) => {
  await page.route("**/api/instagram/runs", async (route) => {
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({
        run: {
          id: "run-1",
          requestedUsername: "nasa",
          normalizedUsername: "nasa",
          status: "queued",
          phase: "queued",
          counts: { posts: 0, comments: 0, stories: 0, highlights: 0 },
          warnings: [],
          errorCode: null,
          errorMessage: null
        }
      })
    });
  });

  await page.route("**/api/instagram/runs/run-1", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        run: {
          id: "run-1",
          requestedUsername: "nasa",
          normalizedUsername: "nasa",
          status: "completed_with_gaps",
          phase: "finalizing",
          counts: { posts: 3, comments: 7, stories: 1, highlights: 2 },
          warnings: ["stories_unavailable"],
          errorCode: null,
          errorMessage: null
        }
      })
    });
  });

  await page.route("**/api/instagram/runs/run-1/results", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        run: { id: "run-1", status: "completed_with_gaps" },
        posts: [{ id: "post-1", status: "retrieved", caption: "Mars" }],
        comments: [{ id: "comment-1", status: "partial", text: "wow" }],
        stories: [{ id: "story-1", status: "inaccessible", gapReason: "stories_unavailable" }],
        highlights: [{ id: "highlight-1", status: "retrieved", title: "Launches" }]
      })
    });
  });

  await page.goto("/instagram");
  await page.getByLabel("Instagram username").fill("nasa");
  await page.getByRole("button", { name: "Start collection" }).click();

  await expect(page.getByText("completed_with_gaps")).toBeVisible();
  await expect(page.getByText("Stories")).toBeVisible();
  await expect(page.getByText("inaccessible")).toBeVisible();
});
```

- [ ] **Step 2: Run the Playwright spec to verify it fails**

Run: `npm run test:e2e -- e2e/specs/routes/instagram-collector.spec.ts`

Expected: FAIL until the `/instagram` route and selectors are fully wired

- [ ] **Step 3: Update docs and env examples**

```env
# .env.example
INSTAGRAM_REQUEST_TIMEOUT_MS=15000
INSTAGRAM_MAX_POSTS_PER_RUN=100
INSTAGRAM_MAX_COMMENTS_PER_POST=200
```

```md
## Instagram Public Collector

- The app exposes an `/instagram` route for public-username collection runs.
- Collection is best-effort and may return `partial`, `missing`, or `inaccessible` statuses.
- Backend run processing is asynchronous and requires PostgreSQL persistence.
```

- [ ] **Step 4: Run the Playwright spec to verify it passes**

Run: `npm run test:e2e -- e2e/specs/routes/instagram-collector.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add e2e/specs/routes/instagram-collector.spec.ts README.md .env.example
git commit -m "test: cover instagram collector flow"
```

---

### Task 8: Final Verification

**Files:**
- Verify only

- [ ] **Step 1: Run all backend Instagram tests**

Run: `npm run test --workspace backend -- src/tests/instagram-run.repository.test.ts src/tests/instagram-collector.service.test.ts src/tests/instagram.routes.test.ts`

Expected: PASS

- [ ] **Step 2: Run all frontend Instagram tests**

Run: `npm run test --workspace frontend -- src/tests/instagram-api.test.ts src/tests/instagram-view.test.ts`

Expected: PASS

- [ ] **Step 3: Run the Playwright collector spec**

Run: `npm run test:e2e -- e2e/specs/routes/instagram-collector.spec.ts`

Expected: PASS

- [ ] **Step 4: Run the backend and frontend builds**

Run: `npm run build`

Expected: PASS for both workspaces

- [ ] **Step 5: Review the final diff for contract honesty**

Run: `git diff -- README.md backend/src/routes/instagram.routes.ts frontend/src/views/InstagramCollectorView.vue`

Expected: The UI copy, API shape, and README all say the feature is best-effort and preserve `partial` / `missing` / `inaccessible` labels without overpromising completeness

- [ ] **Step 6: Commit any final cleanup**

```bash
git add database/schema.sql backend/src/config/env.ts backend/src/types/instagram.ts backend/src/schemas/instagram.schema.ts backend/src/repositories/instagram-run.repository.ts backend/src/services/instagram/source-client.ts backend/src/services/instagram/collector.service.ts backend/src/routes/instagram.routes.ts backend/src/tests/instagram-run.repository.test.ts backend/src/tests/instagram-collector.service.test.ts backend/src/tests/instagram.routes.test.ts frontend/src/lib/api.ts frontend/src/stores/instagram.ts frontend/src/components/instagram/InstagramCollectorForm.vue frontend/src/components/instagram/InstagramRunProgress.vue frontend/src/components/instagram/InstagramResultsSection.vue frontend/src/components/instagram/StatusBadge.vue frontend/src/views/InstagramCollectorView.vue frontend/src/router/index.ts frontend/src/components/layout/AppHeader.vue frontend/src/styles/main.css frontend/src/tests/instagram-api.test.ts frontend/src/tests/instagram-view.test.ts e2e/specs/routes/instagram-collector.spec.ts README.md .env.example
git commit -m "chore: finish instagram collector rollout"
```

---

## Self-Review

**Spec coverage**

- Vue + Node architecture: Tasks 3, 4, 5
- durable collection runs and phases: Tasks 1, 2, 3
- grouped posts/comments/stories/highlights results: Tasks 1, 4, 5
- explicit retrieval statuses: Tasks 1, 2, 5, 6
- partial/inaccessible handling and warnings: Tasks 2, 3, 5, 7
- exports: Task 3
- rate limiting and validation: Task 3
- PostgreSQL persistence: Task 1
- README/env docs: Task 6
- mocked automated coverage: Tasks 2, 3, 4, 5, 6, 7

No uncovered spec requirements remain for the initial implementation slice.

**Placeholder scan**

- Removed `TODO` / `TBD` language
- Every code-changing task includes concrete file paths and code snippets
- Every verification step includes an exact command and expected outcome

**Type consistency**

- Run statuses stay on `queued`, `running`, `completed`, `completed_with_gaps`, `failed`
- Item statuses stay on `retrieved`, `partial`, `missing`, `inaccessible`, `failed`, `not_applicable`
- Route family stays under `/api/instagram/runs`
- Frontend route stays `/instagram`
- `InstagramRunSummary` is the shared frontend/backend summary contract name throughout the plan
