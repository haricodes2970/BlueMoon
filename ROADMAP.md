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
      Milestone 1.1 (the real PINChat V1) implementation begins (see
      ADR-0019). Milestone 1.0's interim messaging slice shipped
      without it, same as every milestone before it — code-review
      enforcement only, unchanged.

**Completion criteria:** all five architecture documents and three new
ADRs reviewed/accepted by the founder. Automated enforcement is not a
blocker for closing 0.4 but should land before Milestone 1.1 writes
real PINChat feature code across these boundaries.

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

## Milestone 0.9 — Social / Friendship + BlueMoon Token

**Status: Complete**

- [x] `blue_moon_tokens`, `friendships` Drizzle schema + migration,
      verified against a fresh PostgreSQL instance
- [x] Domain/application/infrastructure/repository/HTTP layers for
      the Social bounded context, matching Identity's conventions
- [x] BlueMoon Token: random generation, hashed at rest, 300-second
      expiry, single-use enforced by one atomic conditional `UPDATE`
      (not check-then-update)
- [x] Friendship: created only by token consumption (never by
      username alone), undirected, duplicate-proof via a canonical-
      order check constraint
- [x] `app.ts` refactored to share one `Database` instance across
      Identity and Social (no second connection pool)
- [x] 18 fake-container HTTP tests (`pnpm test` stays database-free,
      34/34 total with Identity)
- [x] 14 real-Postgres repository tests + 4 HTTP tests via
      `pnpm test:db` (39/39 total with Identity), including a
      concurrent-consumption test proving exactly one success
- [x] ADR-0026 (BlueMoon Token security model)
- [x] Full quality gate green

**Completion criteria:** username + BlueMoon Token is the only path to
a friendship, token security properties (single-use, 300s expiry,
atomic under concurrency) verified against a real database — met. See
[Phase-0.9.md](./docs/phases/Phase-0.9.md) for the full writeup.

## Milestone 1.0 — 1:1 Messaging Vertical Slice (Interim, Friendship-Gated)

**Status: Complete**

**This is not the canonical PINChat V1 MVP** described in
`docs/product/` (see Milestone 1.1, below, which retains that scope
unchanged). Built as an interim engineering milestone, explicitly
scoped and founder-approved: two genuine, material conflicts between
this milestone's task brief and the canonical product documentation
(session/PIN-gating vs. friendship-gating; required E2EE vs. no
existing encryption design) were found and reported before any
implementation code was written, rather than resolved silently — see
[ADR-0027](./docs/adr/ADR-0027-messaging-friendship-gate-deviation.md)
and [ADR-0029](./docs/adr/ADR-0029-message-encryption-deferred.md) for
the founder's explicit decisions.

- [x] `conversations`/`messages` schema, gated on an existing Social
      Friendship (not a session/PIN) — canonical-pair storage,
      idempotent concurrent creation, verified against a real
      PostgreSQL instance
- [x] Real-time message delivery over an authenticated, per-user
      WebSocket (`/messaging/ws`); persist-then-broadcast, database is
      the source of truth regardless of recipient connection state
- [x] Basic online/offline presence (in-memory, read at request time)
- [x] Message content stored in plaintext — no end-to-end encryption
      (deliberate, disclosed gap, not silently dropped)
- [x] Minimal Next.js frontend: login/register, friend list → start
      conversation, conversation list, active conversation view
      (history, composer, sending state, presence indicator)
- [x] 10 fake-container HTTP tests + 9 fake-container WebSocket tests
      (`pnpm test` 53/53, database-free)
- [x] 13 real-Postgres repository tests + 5 HTTP tests + 2 WebSocket
      tests (`pnpm test:db` 59/59)
- [x] Full golden path verified live in a real browser against a real
      server and a real PostgreSQL instance
- [x] ADR-0027, ADR-0028 (WebSocket architecture), ADR-0029
- [x] Full quality gate green

**Completion criteria:** a working 1:1 messaging vertical slice
(persistent conversations, real-time delivery, basic presence) between
two existing BlueMoon accounts who are already Social friends — met.
Explicitly does **not** meet the canonical PINChat V1 completion
criteria (see Milestone 1.1) — that scope was deliberately deferred,
not attempted. See [Phase-1.0.md](./docs/phases/Phase-1.0.md) for the
full writeup.

**Sub-pass: Deployment Readiness & Production Verification (2026-08-15)**

- [x] `apps/server/Dockerfile`, `.dockerignore`, `railway.json` — see
      [ADR-0032](./docs/adr/ADR-0032-server-docker-deployment.md)
- [x] Fixed a real connection-pool leak in `GET /health` (opened a new
      pool per call instead of reusing the shared one)
- [x] `docker build`/`docker run` verified locally against a real
      disposable PostgreSQL instance; full golden path (register →
      friendship → WS tickets → WS connect → message send/receive →
      history → refresh → logout) passed end-to-end against the
      running container
- [x] Production environment contract documented
      (`docs/deployment/README.md`)
- [x] `pnpm test` 81/81, `pnpm test:db` 67/67
- [x] **No actual Vercel or Railway deployment performed** — see
      [docs/deployment/README.md](./docs/deployment/README.md)'s
      Milestone 1.0 Completion Criteria section for the exact
      repository-ready-vs-externally-verified distinction

**Sub-pass: Platform change — Railway → Render (2026-08-16)**

- [x] Platform decision changed before any external deployment
      happened — [ADR-0033](./docs/adr/ADR-0033-adopt-render-for-backend-hosting.md)
      supersedes [ADR-0012](./docs/adr/ADR-0012-railway.md); ADR-0031
      and ADR-0032 amended in place (not rewritten) since their
      reasoning and the Dockerfile itself are unaffected
- [x] `railway.json` removed; `render.yaml` Blueprint added (web
      service + PostgreSQL, internal `DATABASE_URL` auto-wired via
      `fromDatabase`, `JWT_ACCESS_TOKEN_SECRET` auto-generated via
      `generateValue: true`)
- [x] `docs/deployment/README.md` rewritten Railway → Render
      throughout; code comments referencing "Railway's edge" as the
      trusted proxy hop updated to "Render's edge" (`client-ip.ts`,
      `env.ts`, `index.ts`) — no functional/runtime code changed
- [x] `pnpm test` unchanged at 81/81, `pnpm test:db` unchanged at
      67/67; `docker build`/`docker run` re-verified against the same
      unmodified Dockerfile
- [x] **No actual Render or Vercel deployment performed** — this pass
      is repository preparation only, same distinction as above

## Milestone 1.1 — PINChat V1 (Session/PIN, End-to-End Encryption)

**Status: Blocked** (depends on 0.2, 0.4, and a not-yet-started
session/PIN architecture design — see
[ADR-0027](./docs/adr/ADR-0027-messaging-friendship-gate-deviation.md)
Future Implications)

Renumbered from "Milestone 1.0" — Milestone 1.0 now names the interim
messaging slice actually shipped (see above), which does not meet this
milestone's scope. This section's content is otherwise unchanged from
before the renumbering.

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
| 0.9 Social / Friendship + BlueMoon Token            | Complete                                   | 100%     |
| 1.0 Messaging Vertical Slice (Interim)              | Complete                                   | 100%     |
| 1.1 PINChat V1 (Session/PIN, E2EE)                  | Blocked                                    | 0%       |

## Next Objective

Receiving the founder's actual approved product documents remains the
single biggest blocker, unchanged since Milestone 0.2. In parallel: get
founder sign-off on Milestone 0.4 architecture docs and the new PRD,
and verify CI on an actual GitHub Actions run. Engineering-side,
Milestones 0.5 through 1.0 are now closed — live-database verification,
real-database repository tests, the Social/BlueMoon Token layer, and an
interim messaging vertical slice are all done (see
[Phase-0.8.md](./docs/phases/Phase-0.8.md),
[Phase-0.9.md](./docs/phases/Phase-0.9.md), and
[Phase-1.0.md](./docs/phases/Phase-1.0.md)). Milestone 1.1 (the real
PINChat V1) needs a dedicated session/PIN architecture design before
implementation can start — see
[ADR-0027](./docs/adr/ADR-0027-messaging-friendship-gate-deviation.md)
Future Implications — plus a real end-to-end encryption design (see
[ADR-0029](./docs/adr/ADR-0029-message-encryption-deferred.md) Future
Implications). A post-1.0 production-hardening pass (2026-08-13) added
Messaging rate limiting, WebSocket heartbeat/origin-validation/
graceful shutdown, configurable cookie `SameSite`, credentialed CORS,
and deployment documentation (see
[ADR-0031](./docs/adr/ADR-0031-deployment-architecture.md)). A
follow-on deployment-readiness pass (2026-08-15) added
`apps/server/Dockerfile`/`.dockerignore` and a platform build config
(see [ADR-0032](./docs/adr/ADR-0032-server-docker-deployment.md)),
fixed a real `/health` connection-pool leak found while verifying it,
and verified a full golden path against the built Docker image
running locally with production-shaped config against a real
(disposable) PostgreSQL instance. The platform target then changed
from Railway to Render (2026-08-16, see
[ADR-0033](./docs/adr/ADR-0033-adopt-render-for-backend-hosting.md))
before any external deployment happened — `railway.json` replaced with
a `render.yaml` Blueprint, no functional code changed. Repository-side
deployment readiness is done; **no actual Vercel or Render deployment
has been performed** (see
[docs/deployment/README.md](./docs/deployment/README.md)'s Milestone
1.0 Completion Criteria). Other remaining engineering gaps:
domain-layer unit tests (pure `Username`/`Credential`/session-
lifetime/lockout-policy/BlueMoon-Token-lifetime/`MessageContent`
tests), automated dependency-rule enforcement.
