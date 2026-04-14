# Docker Dev Lockfile Bootstrap Design

**Goal**

Make the Docker development workflow resilient to dependency changes by automatically reinstalling workspace packages only when `package-lock.json` changes, while avoiding a full `npm install` on every container start.

## Problem

The current Docker development setup bind-mounts the repository into the containers and keeps `node_modules` in named volumes:

- backend uses `/app/node_modules`
- frontend uses `/app/node_modules`

That is good for hot reload performance, but it creates a drift problem:

- source files update immediately from the host bind mount
- dependency volumes remain stale until manually rebuilt or reinstalled

This caused the recent `helmet` failure:

- source code imported `helmet`
- `backend/package.json` correctly declared it
- the running container still had an older `node_modules` volume
- startup crashed with `ERR_MODULE_NOT_FOUND`

## Desired Behavior

Docker dev containers should:

- start quickly when dependencies have not changed
- automatically install updated dependencies when `package-lock.json` changes
- avoid forcing the developer to remember rebuild-only recovery steps
- continue supporting bind-mounted source code and hot reload

## Architecture

Add one shared Linux container bootstrap script that both dev containers run before starting their normal process.

The script will:

1. read the current root `package-lock.json`
2. compute a deterministic hash for that file
3. compare it against a stored hash file inside the container’s persisted `node_modules` volume
4. if the hash changed, run `npm install --workspace <workspace>`
5. if the hash is unchanged, skip installation
6. write the new hash after a successful install
7. exec the normal container command

This keeps the logic centralized and avoids duplicating install policy separately in Compose YAML or Dockerfiles.

## Scope

This design applies to:

- [C:\SL\ailab\_web\mathsheets\backend\Dockerfile](C:/SL/ailab/_web/mathsheets/backend/Dockerfile)
- [C:\SL\ailab\_web\mathsheets\frontend\Dockerfile](C:/SL/ailab/_web/mathsheets/frontend/Dockerfile)
- [C:\SL\ailab\_web\mathsheets\docker-compose.yml](C:/SL/ailab/_web/mathsheets/docker-compose.yml)
- a new shared bootstrap script in the repository
- [C:\SL\ailab\_web\mathsheets\README.md](C:/SL/ailab/_web/mathsheets/README.md)

It does not change:

- production container behavior
- application code
- package-manager choice
- Postgres service behavior

## Bootstrap Strategy

### Hash source

Use the root [C:\SL\ailab\_web\mathsheets\package-lock.json](C:/SL/ailab/_web/mathsheets/package-lock.json) as the single dependency fingerprint.

Rationale:

- the repo uses npm workspaces
- workspace dependency changes are reflected in the root lockfile
- one shared fingerprint keeps the rule simple and predictable

### Hash storage

Store the last-installed lockfile hash inside the persisted `node_modules` volume.

A suitable location is something like:

- `/app/node_modules/.cache/mathsheets-backend-package-lock.sha256`
- `/app/node_modules/.cache/mathsheets-frontend-package-lock.sha256`

This ensures the fingerprint survives container restarts along with installed dependencies.

### Install trigger

Run `npm install --workspace backend` or `npm install --workspace frontend` only when:

- the stored hash file is missing
- the current lockfile hash differs from the stored hash
- `node_modules` is missing or empty in a way that makes the workspace unusable

### Command handoff

After bootstrap, the script should `exec` the workspace’s normal dev command so process handling stays correct:

- backend: migrate, seed, then run backend dev server
- frontend: run Vite dev server

## Docker Integration

### Dockerfiles

The backend and frontend Dockerfiles should copy the shared bootstrap script into the image and use it as the container entrypoint or startup command.

The image should still perform an initial install during build so first startup is not unnecessarily slow when no volume is mounted yet.

### Compose

The Compose services should continue to:

- bind-mount the repo at `/app`
- mount named `node_modules` volumes

But their startup command should route through the bootstrap script instead of directly running the dev process.

## Failure Behavior

If the bootstrap install fails:

- the container should fail fast
- logs should clearly show that dependency sync failed
- the script should not write a new hash file

This prevents the volume from being marked “current” when installation did not complete.

## Testing Requirements

This is primarily an environment/bootstrap change, so verification should be practical rather than unit-test heavy.

Required verification:

1. start the backend/frontend containers with an up-to-date lockfile and confirm startup does **not** reinstall unnecessarily
2. change dependencies in a controlled way or invalidate the stored hash and confirm the workspace install runs automatically
3. verify the backend starts cleanly with a newly added dependency such as `helmet`
4. verify frontend Vite startup still works with the bootstrap flow

The verification should be documented in the implementation plan as concrete Docker commands and expected log output.

## Documentation

Update the README to explain:

- Docker dev now auto-syncs dependencies when `package-lock.json` changes
- normal source edits still use hot reload without reinstall
- manual rebuilds are no longer required just to pick up a newly added package
- rebuilds may still be needed for Dockerfile-level changes

## Constraints

Keep the solution narrow:

- only watch `package-lock.json`
- do not add host-specific scripts
- do not introduce bash features that are likely to break on Alpine `sh`
- do not make startup depend on git state or timestamps

## Success Criteria

This work is complete when:

- adding a new npm dependency no longer leaves the Docker dev backend/frontend broken on restart
- unchanged lockfiles do not trigger repeated installs on every start
- both dev services still hot reload source changes normally
- the README explains the new behavior clearly
