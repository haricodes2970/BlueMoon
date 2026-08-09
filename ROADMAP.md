# Roadmap

Tracked as milestones. Each milestone has a status, scope, and
completion criteria. Do not mark a milestone Complete until its
completion criteria are fully met.

## Milestone 0.1 — Repository Scaffold

**Status: Complete**

- [x] Git repository initialized
- [x] Root standards files (README, LICENSE, CODE_OF_CONDUCT,
      CONTRIBUTING, SECURITY, .gitignore)
- [x] `/docs` directory structure (11 areas)
- [x] ADR system + ADR-0001
- [x] CLAUDE.md / ROADMAP.md / CHANGELOG.md
- [x] Engineering coding standards document

## Milestone 0.2 — Engineering Foundation

**Status: In Progress** (blocked — see below)

- [x] Draft + cross-link all five product documents (literature survey,
      blueprint, vision & philosophy, personas, user journeys)
- [x] `docs/architecture/Architecture-Overview.md` (principles, system
      boundaries, future modules, design philosophy — no implementation)
- [x] `docs/architecture/Tech-Stack-Decision.md`
- [x] ADR-0002 through ADR-0014 (full technology stack)
- [x] CLAUDE.md updated for current milestone
- [x] ROADMAP.md converted to milestone tracking (this file)
- [x] Documentation consistency review (contradictions/improvements)
- [ ] **Replace draft product documents with the founder's real,
      approved documents** — the drafts were assistant-authored from a
      product description, not the actual specification; this is now
      the primary blocker for closing 0.2 (see Product Documentation
      Policy in [CLAUDE.md](./CLAUDE.md))
- [ ] Founder review and sign-off on architecture documents

**Completion criteria:** `docs/product/` contains the founder's actual
approved documents (versioned from 1.0.0), and architecture documents
are reviewed/accepted.

## Milestone 0.3 — Engineering Environment

**Status: Complete**

- [x] pnpm workspace (`apps/`, `packages/`, `tooling/`) — recommended
      structure confirmed before generating
- [x] `apps/web`, `apps/server` placeholders (no feature code)
- [x] `packages/{ui,config,types,utils,database,auth}` placeholders
- [x] `tooling/{typescript-config,eslint-config,prettier-config}`
- [x] Root `tsconfig.json` project references
- [x] ESLint, Prettier, EditorConfig (strict)
- [x] Husky + lint-staged + Commitlint
- [x] Turborepo build system + ADR-0015; pnpm workspaces + ADR-0016
- [x] Environment variable strategy + per-app `.env.example` (dev/test/prod)
- [x] `.github/`: issue templates, PR template, CODEOWNERS, Dependabot
- [x] CI workflow skeleton: lint, type-check, test, build, docs-validate
      (no deployment job yet, by design)
- [x] `pnpm install` executed and verified to succeed in a real
      environment (Milestone 0.5) — surfaced and fixed several real
      config bugs in the process (see Milestone 0.5)
- [ ] CI workflow verified green on an actual GitHub Actions run (only
      local equivalents of its jobs have been run)
- [ ] Deploy pipelines to Railway (ADR-0012) and Vercel (ADR-0013) —
      deliberately deferred past this milestone

**Completion criteria:** a contributor can clone the repo, run
`pnpm install`, and see lint/type-check/build succeed locally — met.
CI-on-a-real-PR and deploy pipelines remain open, tracked separately,
not blocking this milestone's completion.

## Milestone 0.4 — Core Architecture

**Status: In Progress**

- [x] `docs/architecture/System-Architecture.md` — style, dependency
      direction, boundaries, system diagram, validation/risks
- [x] `docs/architecture/Package-Architecture.md` — exact responsibility
      per package, "add a package" justification process
- [x] `docs/architecture/Dependency-Rules.md` — import matrix, layer
      rules
- [x] `docs/architecture/Backend-Architecture.md` — routes → events
      layers, diagram
- [x] `docs/architecture/Frontend-Architecture.md` — app → assets
      layers, diagram
- [x] Expanded coding standards (naming, barrel exports, import order,
      error handling, logging, comments, testing)
- [x] ADR-0017 (overall architecture), ADR-0018 (package boundaries),
      ADR-0019 (dependency rules)
- [ ] Founder review and sign-off on all five architecture documents
- [ ] Automated dependency-rule enforcement (ESLint boundaries rule) —
      deliberately deferred past this milestone, tracked for before
      Milestone 1.0 implementation begins (see ADR-0019)

**Completion criteria:** all five architecture documents and three new
ADRs reviewed/accepted by the founder. Automated enforcement is not a
blocker for closing 0.4 but must land before Milestone 1.0 writes real
code across these boundaries.

## Milestone 0.5 — Core Infrastructure

**Status: Complete**

- [x] Verified the workspace for real: `pnpm install`, Turbo pipelines,
      TS project references, lint, format — all run from a clean
      `node_modules`, not just documented. Found and fixed real bugs
      (ESLint 9 flat-config migration, missing `dist/` builds for
      shared packages, ESM/CJS `"type"` mismatches, a Next.js/
      typescript-eslint parser conflict)
- [x] `apps/server`: Hono, TypeScript, `@hono/zod-openapi`, Zod
      validation, centralized logging, `GET /health` returning
      `{ status, version, environment }`
- [x] `apps/web`: Next.js App Router, TypeScript, Tailwind, shadcn/ui
      (one primitive + full config), Zustand (dependency only, no
      store yet), TanStack Query (provider wired)
- [x] `packages/config`: Zod environment schema, typed fail-fast loader
- [x] `packages/types`: common types, API response types, error types
- [x] `packages/utils`: logger, date helpers, id helpers, result/error
      helpers
- [x] `packages/database`: Drizzle setup, PostgreSQL connection,
      migration config, seed entry point — no business schema
- [x] `packages/auth`: placeholder exports only
- [x] Environment loading + Zod validation + typed config, fail-fast
      (`packages/config`)
- [x] Centralized logger: structured logs, log levels, request IDs,
      dev/prod formatting, shared via `packages/utils`
- [x] Standard error classes, API error responses, unknown-error
      handler, validation error mapping (`packages/utils` +
      `apps/server/src/middleware/error-handler.ts`)
- [x] Health checks: `/health` endpoint, DB connectivity check
      (optional/degraded if unavailable), version reporting
- [x] `pnpm install`/`lint`/`type-check`/`build`/`format:check` all
      verified green from a clean install
- [x] ADR-0020 (logging), ADR-0021 (configuration), ADR-0022 (error
      handling)
- [x] `apps/server` verified against a real PostgreSQL instance —
      closed under Milestone 0.8

**Completion criteria:** every quality gate (`lint`, `type-check`,
`build`, `format:check`) passes from a clean install, and live-database
connectivity is verified — met.

## Milestone 0.6 — Identity & Authentication Foundation

**Status: Complete**

- [x] Drizzle schema: `users`, `devices`, `trusted_devices`,
      `sessions`, `refresh_tokens`, `login_attempts`, `audit_events`
      (migration generated and inspected, not applied to a live DB)
- [x] Domain layer: `Username`/`Credential` value objects, entities,
      session-lifetime + lockout rules, typed domain errors
- [x] Infrastructure: Argon2id hashing, JWT access tokens, opaque
      rotating refresh tokens, in-memory rate limiter, audit writer
- [x] Repositories: one per entity (Drizzle-backed)
- [x] Application layer: register/login/logout/refresh-session
      (rotation + reuse detection)/revoke-session/trust-device/
      change-credential use cases, validation schemas, output DTOs
- [x] Root-caused and fixed a reproducible `tsc` build race
- [x] `docs/security/{Authentication,Session-Management}.md`,
      `docs/database/Identity-Schema.md`
- [x] ADR-0023 (identity domain model), ADR-0024 (session strategy),
      ADR-0025 (credential authentication)
- [x] Credential/PIN naming conflict resolved (ADR-0025, closed under
      Milestone 0.7)

**Completion criteria:** domain/repository/application layers complete
and internally verified, naming conflict resolved — met. HTTP layer,
test suite, and live-DB verification were originally listed here but
delivered/tracked under Milestone 0.7 instead, once that milestone was
explicitly scoped separately.

## Milestone 0.7 — Identity HTTP/API Layer

**Status: Complete**

- [x] Composition root (`container.ts`) wiring Milestone 0.6's
      repositories/infrastructure/services, unmodified
- [x] Auth middleware (Bearer access token) + rate-limit middleware
- [x] All 9 endpoints: register/login/logout/refresh/change-credential/
      trust-device/revoke-device-trust/me/devices — routes and
      controllers as separate files, full OpenAPI docs at `/docs` +
      `/openapi.json`
- [x] Cookie-based refresh transport (`httpOnly`, `/auth`-scoped),
      access token in the response body
- [x] Selected Vitest as the workspace test runner (open since
      Milestone 0.3); 16 real integration tests, all passing —
      `pnpm test` is no longer a no-op
- [x] ADR-0025 resolved: internal "credential", user-facing "PIN",
      DB fields and digit range (4–8) unchanged
- [x] Verified against a live PostgreSQL instance — closed under
      Milestone 0.8

**Completion criteria:** every endpoint implemented and tested, and
verified against a real database — met. Domain-layer unit tests (pure
function tests for `Username`/`Credential`/session-lifetime/
lockout-policy in isolation) remain open, tracked in TODO.md — not a
blocker for this milestone, which was scoped to the HTTP/API layer.

## Milestone 0.8 — Real PostgreSQL Integration & Repository Verification

**Status: Complete**

- [x] Local disposable PostgreSQL (`docker-compose.yml`)
- [x] Real-database test harness + `pnpm test:db`, kept fully separate
      from `pnpm test` (no database required for the default gate)
- [x] Repository-level integration tests (15): unique/FK/index
      constraints, CRUD round-trips, cascade delete, connection-pool
      concurrency
- [x] HTTP-level integration tests (6): registration, lockout, refresh
      rotation + reuse detection, trust-device, change-credential,
      logout — all through the real Drizzle-backed container
- [x] Migration verified to apply cleanly to a fresh database; schema,
      FKs, unique constraints, and all 13 indexes confirmed present
      via `psql`
- [x] Real correctness issue found and fixed: refresh-token rotation
      TOCTOU race (concurrent requests could both rotate the same
      token) — closed with an atomic conditional `revoke()`; see
      [Session-Management.md](./docs/security/Session-Management.md#concurrent-rotation-milestone-08)
- [x] Full quality gate (`install`/`build`/`lint`/`type-check`/`test`/
      `format:check`) green; `pnpm test:db` 21/21

**Completion criteria:** the existing Identity stack (schema,
repositories, application services, HTTP API) proven against a real
PostgreSQL instance, not just in-memory fakes — met. See
[Phase-0.8.md](./docs/phases/Phase-0.8.md) for the full writeup.

## Milestone 1.0 — PINChat MVP

**Status: Blocked** (depends on 0.2 through 0.8)

- [ ] Session/PIN issuance and join flow (Journey 1)
- [ ] Group session lifecycle (Journey 2)
- [ ] Real-time messaging within a session
- [ ] Basic media sharing (Cloudflare R2, per ADR-0011)
- [ ] End-to-end encryption of message content
- [ ] Contact-save / persistence flow
- [ ] Session expiry

**Completion criteria:** both user journeys in
[User Journey & Flow Specification](./docs/product/user-journey-and-flow-specification.md)
are implemented end-to-end and match the V1 scope in
[Product Blueprint](./docs/product/product-blueprint.md).

## Progress Summary

| Milestone                                           | Status                                     | Progress |
| --------------------------------------------------- | ------------------------------------------ | -------- |
| 0.1 Repository Scaffold                             | Complete                                   | 100%     |
| 0.2 Engineering Foundation                          | In Progress — blocked on real product docs | ~85%     |
| 0.3 Engineering Environment                         | Complete                                   | 100%     |
| 0.4 Core Architecture                               | In Progress — pending review               | ~90%     |
| 0.5 Core Infrastructure                             | Complete                                   | 100%     |
| 0.6 Identity & Auth Foundation                      | Complete                                   | 100%     |
| 0.7 Identity HTTP/API Layer                         | Complete                                   | 100%     |
| 0.8 Real PostgreSQL Integration & Repo Verification | Complete                                   | 100%     |
| 1.0 PINChat MVP                                     | Blocked                                    | 0%       |

## Next Objective

Receiving the founder's actual approved product documents remains the
single biggest blocker, unchanged since Milestone 0.2. In parallel: get
founder sign-off on Milestone 0.4 architecture docs and the new PRD,
and verify CI on an actual GitHub Actions run. Engineering-side,
Milestones 0.5 through 0.8 are now closed — live-database verification
and real-database repository tests are done (see
[Phase-0.8.md](./docs/phases/Phase-0.8.md)). Remaining engineering gaps
before Milestone 1.0: domain-layer unit tests (pure `Username`/
`Credential`/session-lifetime/lockout-policy tests), automated
dependency-rule enforcement, and Milestone 0.9 (Social/Friendship +
BlueMoon Token) is not yet scoped in this document.
