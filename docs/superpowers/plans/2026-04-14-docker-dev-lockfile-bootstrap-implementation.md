# Docker Dev Lockfile Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Docker dev containers auto-install workspace dependencies only when `package-lock.json` changes, so new packages like `helmet` stop crashing the live backend/frontend after source-only updates.

**Architecture:** Add one shared POSIX shell bootstrap script that both dev containers call before launching their normal command. The script fingerprints the root `package-lock.json`, compares it to a cached hash inside the persisted `node_modules` volume, installs only when the fingerprint changes, then `exec`s the normal workspace startup command. Dockerfiles and Compose are updated to route startup through that script, and README documents the new workflow.

**Tech Stack:** Docker Compose, Alpine `sh`, npm workspaces, Node 24, backend/frontend dev containers

---

## File map

### Existing files to modify

- `backend/Dockerfile`
  - copy the shared bootstrap script into the image and use it in the startup command
- `frontend/Dockerfile`
  - copy the shared bootstrap script into the image and use it in the startup command
- `docker-compose.yml`
  - route backend/frontend startup through the lockfile-aware bootstrap
- `README.md`
  - document lockfile-aware dependency sync behavior for Docker development

### New files to create

- `scripts/docker-dev-bootstrap.sh`
  - shared startup script for both backend and frontend containers

---

### Task 1: Add the failing Docker startup bootstrap script skeleton

**Files:**
- Create: `scripts/docker-dev-bootstrap.sh`

- [ ] **Step 1: Create the shared bootstrap script file**

Create `scripts/docker-dev-bootstrap.sh` with this initial structure:

```sh
#!/bin/sh
set -eu

workspace="${1:?workspace name required}"
shift

lockfile="/app/package-lock.json"
cache_dir="/app/node_modules/.cache"
hash_file="$cache_dir/mathsheets-${workspace}-package-lock.sha256"

mkdir -p "$cache_dir"

current_hash="$(sha256sum "$lockfile" | awk '{print $1}')"
stored_hash=""

if [ -f "$hash_file" ]; then
  stored_hash="$(cat "$hash_file")"
fi

if [ ! -d "/app/node_modules" ] || [ ! -f "$hash_file" ] || [ "$current_hash" != "$stored_hash" ]; then
  echo "[bootstrap] package-lock.json changed for $workspace, installing dependencies..."
  npm install --workspace "$workspace"
  printf '%s' "$current_hash" > "$hash_file"
else
  echo "[bootstrap] package-lock.json unchanged for $workspace, skipping install."
fi

exec "$@"
```

- [ ] **Step 2: Make the script executable**

Run:

```bash
git update-index --chmod=+x scripts/docker-dev-bootstrap.sh
```

Expected:

- git records the file as executable

- [ ] **Step 3: Commit the bootstrap skeleton**

```bash
git add scripts/docker-dev-bootstrap.sh
git commit -m "feat: add docker dev bootstrap script"
```

---

### Task 2: Wire backend and frontend Dockerfiles through the bootstrap script

**Files:**
- Modify: `backend/Dockerfile`
- Modify: `frontend/Dockerfile`

- [ ] **Step 1: Update the backend Dockerfile**

Modify `backend/Dockerfile` to copy the shared script:

```dockerfile
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY scripts/docker-dev-bootstrap.sh /usr/local/bin/docker-dev-bootstrap.sh

RUN chmod +x /usr/local/bin/docker-dev-bootstrap.sh
RUN npm install --workspace backend

COPY backend ./backend
COPY database ./database
COPY scripts ./scripts

EXPOSE 3000

CMD ["sh", "-c", "/usr/local/bin/docker-dev-bootstrap.sh backend sh -c 'npm run migrate --workspace backend && npm run seed --workspace backend && npm run dev --workspace backend'"]
```

- [ ] **Step 2: Update the frontend Dockerfile**

Modify `frontend/Dockerfile` similarly:

```dockerfile
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY scripts/docker-dev-bootstrap.sh /usr/local/bin/docker-dev-bootstrap.sh

RUN chmod +x /usr/local/bin/docker-dev-bootstrap.sh
RUN npm install --workspace frontend

COPY frontend ./frontend
COPY scripts ./scripts

EXPOSE 5173

CMD ["sh", "-c", "/usr/local/bin/docker-dev-bootstrap.sh frontend npm run dev --workspace frontend -- --host 0.0.0.0 --port 5173"]
```

- [ ] **Step 3: Check Dockerfiles for quoting and path consistency**

Run:

```bash
Get-Content backend\Dockerfile
Get-Content frontend\Dockerfile
```

Expected:

- both images copy the same bootstrap script
- both call the bootstrap script with the correct workspace name
- command quoting is valid for Alpine `sh`

- [ ] **Step 4: Commit the Dockerfile wiring**

```bash
git add backend/Dockerfile frontend/Dockerfile
git commit -m "feat: route dev images through lockfile bootstrap"
```

---

### Task 3: Make Compose use the lockfile-aware startup flow

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Keep Compose mounts, but ensure startup uses the image command**

Review `docker-compose.yml` and keep the existing volumes:

```yaml
    volumes:
      - .:/app
      - backend-node-modules:/app/node_modules
```

and:

```yaml
    volumes:
      - .:/app
      - frontend-node-modules:/app/node_modules
```

Do not add a `command:` override unless it is needed to preserve the Dockerfile command. The desired behavior is for Compose to use the bootstrap-driven `CMD` from each Dockerfile.

- [ ] **Step 2: Validate Compose config**

Run:

```bash
docker compose config
```

Expected:

- config renders successfully
- backend/frontend service definitions remain valid

- [ ] **Step 3: Commit any Compose changes**

```bash
git add docker-compose.yml
git commit -m "chore: keep compose aligned with bootstrap startup"
```

If no Compose changes are needed after validation, skip this commit.

---

### Task 4: Document the new Docker dependency-sync workflow

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the stale rebuild-only guidance**

Update the Docker development section in `README.md` so it says:

```md
The Docker Compose frontend and backend services are configured for development hot reload:

- frontend changes under `frontend/` update through Vite HMR on `http://localhost:5180`
- backend changes under `backend/` restart the Express server automatically
- if `package-lock.json` changes, the dev containers now reinstall the affected workspace dependencies automatically on next start

You still need `docker compose up --build` after Dockerfile changes or base-image changes, but not just for normal npm dependency additions.
```

- [ ] **Step 2: Add a short troubleshooting note**

Add a note like:

```md
If a dependency install fails during container startup, the container will exit and logs will show the npm error. Fix the dependency issue, then start the service again.
```

- [ ] **Step 3: Commit the README update**

```bash
git add README.md
git commit -m "docs: explain Docker lockfile bootstrap"
```

---

### Task 5: Verify lockfile-aware behavior in Docker

**Files:**
- Verify the Docker setup only; no new files required unless a script adjustment is needed

- [ ] **Step 1: Rebuild and start the dev stack**

Run:

```bash
docker compose up --build -d backend frontend
```

Expected:

- images rebuild successfully
- backend and frontend containers start

- [ ] **Step 2: Confirm first startup behavior in logs**

Run:

```bash
docker compose logs --tail=80 backend
docker compose logs --tail=80 frontend
```

Expected:

- each service logs either:
  - install triggered because no hash existed yet
  - or install skipped because hash is current
- backend proceeds to migrate/seed/dev
- frontend proceeds to Vite dev startup

- [ ] **Step 3: Confirm a second restart skips install**

Run:

```bash
docker compose restart backend frontend
docker compose logs --tail=80 backend
docker compose logs --tail=80 frontend
```

Expected:

- logs show `package-lock.json unchanged ... skipping install`
- services come back without repeating `npm install`

- [ ] **Step 4: Simulate lockfile drift and confirm reinstall**

Without changing real dependencies, remove one cached hash file inside a running container and restart.

Run:

```bash
docker compose exec backend sh -c "rm -f /app/node_modules/.cache/mathsheets-backend-package-lock.sha256"
docker compose restart backend
docker compose logs --tail=80 backend
```

Expected:

- backend detects missing hash file
- backend reruns `npm install --workspace backend`
- backend rewrites the hash and starts normally

Repeat for frontend:

```bash
docker compose exec frontend sh -c "rm -f /app/node_modules/.cache/mathsheets-frontend-package-lock.sha256"
docker compose restart frontend
docker compose logs --tail=80 frontend
```

Expected:

- frontend reruns `npm install --workspace frontend`
- Vite starts normally afterward

- [ ] **Step 5: Verify the original `helmet` scenario is resolved**

Run:

```bash
docker compose logs --tail=80 backend
Invoke-WebRequest http://localhost:3000/api/health
```

Expected:

- no `ERR_MODULE_NOT_FOUND` for `helmet`
- health endpoint responds successfully

- [ ] **Step 6: Commit any final script adjustments from verification**

```bash
git add scripts/docker-dev-bootstrap.sh backend/Dockerfile frontend/Dockerfile docker-compose.yml README.md
git commit -m "test: verify Docker lockfile bootstrap"
```

If no further changes were needed after verification, skip this commit.

---

## Self-review

### Spec coverage

Covered requirements:

- shared bootstrap script: Tasks 1 and 2
- lockfile hashing and stored fingerprint: Task 1
- Dockerfile and Compose integration: Tasks 2 and 3
- failure behavior via fail-fast startup: Task 1 and Task 5
- practical Docker verification: Task 5
- README updates: Task 4

No spec gaps found.

### Placeholder scan

No `TODO`, `TBD`, or vague “handle appropriately” steps remain. Each task includes exact files, concrete commands, and expected behavior.

### Type and naming consistency

The plan consistently uses:

- `scripts/docker-dev-bootstrap.sh`
- `/app/node_modules/.cache/mathsheets-<workspace>-package-lock.sha256`
- workspace names `backend` and `frontend`

No naming drift found.
