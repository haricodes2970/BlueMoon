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

**Status: In Progress**

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
- [ ] `apps/server` verified against a real PostgreSQL instance — no
      live database was available in this environment; connection/
      migrate/seed code type-checks and `drizzle-kit generate` runs,
      but actual connectivity is untested

**Completion criteria:** every quality gate (`lint`, `type-check`,
`build`, `format:check`) passes from a clean install — met, verified
directly, not assumed. Live-database verification remains open.

## Milestone 0.6 — Identity & Authentication Foundation

**Status: In Progress**

- [x] Drizzle schema: `users`, `devices`, `trusted_devices`,
      `sessions`, `refresh_tokens`, `login_attempts`, `audit_events`
      (migration generated and inspected, not applied to a live DB)
- [x] Domain layer: `Username`/`Credential` value objects, entities,
      session-lifetime + lockout rules, typed domain errors
- [x] Infrastructure: Argon2id hashing, JWT access tokens, opaque
      rotating refresh tokens, in-memory rate limiter (not yet wired to
      an endpoint), audit writer
- [x] Repositories: one per entity (Drizzle-backed)
- [x] Application layer: register/login/logout/refresh-session
      (rotation + reuse detection)/revoke-session/trust-device/
      change-credential use cases, validation schemas, output DTOs
- [x] Root-caused and fixed a reproducible `tsc` build race
- [x] `docs/security/{Authentication,Session-Management}.md`,
      `docs/database/Identity-Schema.md`
- [x] ADR-0023 (identity domain model), ADR-0024 (session strategy),
      ADR-0025 (credential authentication)
- [ ] **Resolve the credential/PIN naming + digit-range conflict**
      (see ADR-0025) — blocks calling this milestone done
- [ ] HTTP/API layer (routes, controllers, OpenAPI, auth middleware) —
      explicitly deferred, not started
- [ ] Automated test suite (test runner not yet selected; verified so
      far via manual scripts against in-memory fakes, not committed
      tests)
- [ ] Verified against a live PostgreSQL instance

**Completion criteria:** naming conflict resolved; HTTP layer built and
verified end-to-end (not just the application layer in isolation); a
real, repeatable test suite exists and passes in CI; repositories
verified against a live PostgreSQL instance.

## Milestone 1.0 — PINChat MVP

**Status: Blocked** (depends on 0.2 through 0.6)

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

| Milestone                      | Status                                                                | Progress |
| ------------------------------ | --------------------------------------------------------------------- | -------- |
| 0.1 Repository Scaffold        | Complete                                                              | 100%     |
| 0.2 Engineering Foundation     | In Progress — blocked on real product docs                            | ~85%     |
| 0.3 Engineering Environment    | Complete                                                              | 100%     |
| 0.4 Core Architecture          | In Progress — pending review                                          | ~90%     |
| 0.5 Core Infrastructure        | In Progress — pending live-DB verification                            | ~95%     |
| 0.6 Identity & Auth Foundation | In Progress — naming conflict + HTTP layer + tests + live DB all open | ~55%     |
| 1.0 PINChat MVP                | Blocked                                                               | 0%       |

## Next Objective

Two blockers now compete for top priority: (1) receiving the founder's
actual approved product documents (unchanged since Milestone 0.2), and
(2) resolving the credential/PIN naming conflict from Milestone 0.6
before more code is built on top of the wrong name. In parallel: get
founder sign-off on Milestone 0.4 architecture docs and the new PRD,
verify `apps/server` (including Identity) against a real PostgreSQL
instance, verify CI on an actual GitHub Actions run, and build the
Identity HTTP layer + test suite.
