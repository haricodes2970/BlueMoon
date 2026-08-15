# ADR-0032: Docker as the Railway Build Mechanism for apps/server

- **Date:** 2026-08-15
- **Status:** Accepted

## Context

Milestone 1.0 needed to make `apps/server` actually deployable to
Railway ([ADR-0012](./ADR-0012-railway.md)). Railway can build a
service two ways: its own Nixpacks buildpack (auto-detects a language
and build/start command from the repository), or a Dockerfile it
builds and runs directly. `docs/deployment/README.md` previously
described the Nixpacks path as the assumed mechanism, but no
deployment config of either kind had ever been created or tried.

This repository is a pnpm workspace with Turborepo, and `apps/server`
depends on four workspace packages (`config`, `database`, `types`,
`utils`) that must be built (`tsc` to `dist/`) and correctly linked in
`node_modules` before `node dist/index.js` can run. Nixpacks' default
Node detection assumes a single-package repository with one
`package.json` at the root defining `build`/`start` — it does not
understand a pnpm workspace's multi-package dependency graph, a
Turborepo `--filter` build, or that only one of the two apps
(`apps/server`) should be built and run by this particular service.
Making Nixpacks work correctly here would require either a custom
`nixpacks.toml` reimplementing filtered-install-then-turbo-build logic
in Nixpacks' own plan format, or `apps/server` becoming buildable in
isolation from the rest of the workspace (it isn't, by design — see
[Package-Architecture.md](../architecture/Package-Architecture.md)).

## Decision

**Use a Dockerfile** (`apps/server/Dockerfile`), pointed at by
`railway.json` (`build.builder: "DOCKERFILE"`), as the reproducible
build mechanism for `apps/server` on Railway, instead of Nixpacks.

The Dockerfile is a three-stage build (full detail in
`docs/deployment/README.md#docker-build-appsserver`):

1. **builder** — `pnpm install --filter=@bluemoon/server...` (server
   plus its four workspace dependencies only, never touching
   `apps/web`'s Next.js/sharp/etc. dependency tree), then `pnpm turbo
run build --filter=@bluemoon/server...`.
2. **prod-deps** — a second, `--prod`-only install for a
   `node_modules` tree with no devDependencies.
3. **runtime** — `node:20-alpine`, copies only the built `dist/`
   output and production `node_modules` from the previous two stages.
   No source, no build tools, no dev dependencies, no secrets baked
   in (every environment variable is supplied at container-run time).

Build context is the **repository root**, not `apps/server/`, since
pnpm/Turborepo need the whole workspace graph (`pnpm-workspace.yaml`,
sibling package `package.json` files) to resolve correctly — this is
explicit in both the Dockerfile's own comments and
`docs/deployment/README.md`.

`apps/web` gets no Dockerfile and no `vercel.json` — Vercel's native
Next.js monorepo support (Root Directory = `apps/web` in project
settings) needs no custom build configuration for this repository
shape, so none was added, matching the task brief's instruction not to
create deployment config files that aren't actually needed.

## Alternatives Considered

- **Custom `nixpacks.toml`**: rejected — would need to hand-encode the
  same filtered-install-then-turbo-build sequence the Dockerfile
  already expresses more legibly and testably (a Dockerfile can be
  built and run locally with `docker build`/`docker run`, verified
  before ever touching Railway; a `nixpacks.toml` plan is harder to
  reproduce and debug outside Railway's own build environment).
- **Monorepo-root Nixpacks default (no config)**: rejected outright
  during Phase 1 inspection — Railway's auto-detected build/start
  commands have no way to know this service means `apps/server`
  specifically, not `apps/web` or the workspace root.
- **`pnpm deploy`** (pnpm's built-in command for producing a
  self-contained deployable subset of one workspace package):
  considered, not used — its file-selection behavior around a
  gitignored `dist/` directory (this repository's build output is
  gitignored, see `.gitignore`) was uncertain enough, without the
  ability to verify it against pnpm's actual behavior in this
  environment beforehand, that the explicit multi-stage Dockerfile
  (whose contents are fully visible and were verified by an actual
  local `docker build`/`docker run`) was the safer choice.

## Consequences

- Railway now needs `build.builder: "DOCKERFILE"` and
  `build.dockerfilePath: "apps/server/Dockerfile"` set (via
  `railway.json`, committed) rather than relying on auto-detection.
- Local reproducibility: `docker build -f apps/server/Dockerfile -t
bluemoon-server .` from the repository root produces the exact same
  artifact Railway would build, independent of Railway's build
  environment — verified locally (image builds, starts against a real
  disposable PostgreSQL instance with production-shaped environment
  variables, serves the full golden path; see
  `docs/deployment/README.md`'s Milestone 1.0 Completion Criteria).
- Root `package.json`'s `prepare` script (`husky`) fails in the
  `--prod`/isolated install stages, since husky is a root
  devDependency not installed there and the build context has no
  `.git` directory — worked around by stripping the `prepare` script
  from the in-container copy of `package.json` before running
  `pnpm install` in those stages, rather than skipping all lifecycle
  scripts (argon2's postinstall, which compiles its native addon,
  must still run).
- Image size ≈230MB (`node:20-alpine` base, production dependencies
  only, no source).
- Database migrations remain a separate, explicit step (unchanged
  from ADR-0031) — not part of the image's `CMD`, not run on
  container start.

## Future Implications

If `apps/server` grows dependencies with native addons beyond
`argon2` (which already works via this pattern), each would need the
same "don't skip lifecycle scripts entirely" treatment. If a fifth
workspace package becomes a dependency of `apps/server`, the
Dockerfile's explicit per-package `COPY` lines need a matching
addition — there is no wildcard shortcut given the current explicit,
auditable structure; this was a deliberate tradeoff (explicit and
verifiable over automatic and opaque) given the risk profile of a
production deployment artifact.
