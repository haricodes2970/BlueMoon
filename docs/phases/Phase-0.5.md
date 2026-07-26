# Phase 0.5 — Core Infrastructure

**Status: In Progress — pending live-database verification** | **Dates:** 2026-07-25

## Purpose

Turn the Phase 0.3 placeholders into a real, working foundation:
actually run `pnpm install` for the first time, implement the shared
packages for real, and stand up working `apps/web`/`apps/server`
shells — infrastructure only, no messaging/friends/users/auth product
logic.

## Goals

- A verified (not just documented) workspace: install, Turbo pipelines,
  TS project references, lint, format all actually run.
- `apps/server`: Hono, TypeScript, OpenAPI, Zod validation, logging,
  a real `/health` endpoint.
- `apps/web`: Next.js App Router, Tailwind, shadcn/ui, Zustand,
  TanStack Query.
- Shared packages (`config`, `types`, `utils`, `database`)
  implemented for real; `auth` as placeholder exports only.
- Centralized logging and typed error handling.
- Every quality gate green from a clean install.

## Tasks

- [x] Verify the workspace for real (`pnpm install`, lint, type-check,
      build, format)
- [x] `apps/server` bootstrapped (Hono, OpenAPI, Zod, logging, health)
- [x] `apps/web` bootstrapped (Next.js, Tailwind, shadcn/ui, Zustand,
      TanStack Query)
- [x] `packages/{types,utils,config,database}` implemented for real
- [x] `packages/auth` placeholder exports
- [x] Config/logging/error-handling/health wired into `apps/server`
- [x] ADR-0020, ADR-0021, ADR-0022
- [ ] `apps/server` verified against a real PostgreSQL instance

## Completed Work

Ran `pnpm install` for the first time in this environment. Found and
fixed four real, previously-latent bugs: ESLint 9 requires flat config
(tooling shipped legacy `.eslintrc` format, and `eslint` itself was
never an installed dependency anywhere); shared packages' `package.json`
pointed `main`/`types` at raw `.ts` source, which breaks a real
`node dist/index.js` production start; missing `"type": "module"` broke
named-export interop under tsx/Node, and adding it then broke every
CJS `eslint.config.js` (renamed to `.cjs`); `eslint-config-next`'s
parser doesn't satisfy typescript-eslint's parser-services check and
doesn't track type-only-import usage the same way (reordered config,
disabled Next's redundant build-time lint pass). `packages/types`:
`Environment`, `ApiResponse<T>`, typed `ErrorCode`/`ApiErrorBody`,
`HealthCheckResponse`. `packages/utils`: pino-based
`createLogger`/`withRequestId`, date/id helpers, `Result<T, E>`,
`AppError` class hierarchy. `packages/config`: Zod
`baseEnvSchema`/`extendEnvSchema`, fail-fast `loadEnv()`.
`packages/database`: Drizzle + `postgres.js` connection, migrate/seed
CLI entry points, `checkDatabaseConnection()` — no business schema yet.
`packages/auth`: placeholder exports only, all throw "not implemented".
`apps/server`: Hono + `@hono/zod-openapi`, request-ID middleware,
centralized error handler, fail-fast env, `GET /health` +
`GET /openapi.json` + `GET /docs` — verified by running the dev server
and hitting each endpoint directly, and separately by running a real
production build (`tsc` → `node dist/index.js`). `apps/web`: Next.js
App Router + Tailwind + shadcn/ui (one hand-added primitive, since this
environment can't run the CLI's interactive registry fetch) +
TanStack Query provider — verified via a real `next build` and
`next start`. ADR-0020 (pino logging), ADR-0021 (Zod-validated
fail-fast config), ADR-0022 (typed `AppError` hierarchy + centralized
HTTP error mapping).

## Files Created

`packages/types/src/*`, `packages/utils/src/*`, `packages/config/src/*`,
`packages/database/src/{client,health,migrate,seed,schema}.ts`,
`packages/auth/src/index.ts` (placeholder), `apps/server/src/*`
(app, routes, middleware, env, logger, version), `apps/web/src/*`
(app router pages/layout, providers, globals.css), `docs/adr/ADR-0020-logging.md`,
`docs/adr/ADR-0021-configuration.md`, `docs/adr/ADR-0022-error-handling.md`.

## Files Modified

Every `tooling/eslint-config/*` file (flat-config migration), every
package's `package.json` (`main`/`types`/`"type": "module"`),
`CLAUDE.md`, `ROADMAP.md`, `DECISIONS.md`,
`docs/engineering/Engineering-Journal.md`, `CHANGELOG.md`.

## Architecture Decisions

ADR-0020 (logging), ADR-0021 (configuration), ADR-0022 (error handling).

## Problems Found

No live PostgreSQL instance available in this environment —
`packages/database`'s connection/migrate/seed code type-checks and
`drizzle-kit generate` ran successfully against the (then-empty)
schema, but actual connectivity was never verified. CI has only been
verified via local equivalents of its jobs, not an actual GitHub
Actions run. One commit (`fix(eslint): ignore next-env.d.ts globally`)
ended up bundling the full `apps/web` implementation too — a failed
pre-commit hook's stash-revert left files staged from a prior attempt;
content was correct and verified, only the commit message undersold
its scope.

## Problems Solved

All four bugs listed under Completed Work (ESLint 9 flat config,
`dist/` builds for `node` resolution, ESM/CJS `"type"` mismatches, the
Next.js/typescript-eslint parser conflict) — each verified fixed by
actually re-running `pnpm lint`/`type-check`/`build`, not by re-reading
config and assuming it was correct.

## Quality Gate Results

`pnpm install`, `pnpm lint`, `pnpm type-check`, `pnpm build`,
`pnpm format:check` all verified green from a clean `node_modules`.
`pnpm test` was not applicable — no test runner existed yet.

## Lessons Learned

Configuration that looks correct on inspection can still be wrong in
ways that only surface when actually executed — every bug found this
phase (flat config, module resolution, ESM/CJS) was invisible from
reading the config files alone. This is why every phase from here
forward runs real commands (`pnpm install`, `tsc`, running the compiled
output) rather than trusting that documented intent matches reality.

## Next Phase

[Phase-0.6.md](./Phase-0.6.md) — Identity & Authentication Foundation:
the first full bounded-context implementation (domain, application,
infrastructure, repository layers) for platform identity.
