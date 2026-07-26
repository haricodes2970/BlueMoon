# Engineering Journal

Chronological log of completed milestones. One short entry per
milestone completion — not per commit. Purpose: fast human/AI review
without reading every commit or ADR individually. Newest entry on top.

Entry format:

```
## YYYY-MM-DD

Milestone X.Y

Completed
- ...

Decisions
- ...

Problems
- ...

Next
- ...
```

---

## 2026-07-25

Milestone 0.5

Completed

- Ran a real `pnpm install` for the first time (previous milestones
  only documented intent). Found and fixed real bugs: ESLint 9
  requires flat config (tooling shipped legacy `.eslintrc` format);
  `eslint` itself was never an installed dependency anywhere; shared
  packages pointed "main" at raw `.ts` source, which breaks a real
  `node dist/index.js` production start; missing `"type": "module"`
  broke named-export interop under tsx/Node; adding it then broke
  every CJS `eslint.config.js` (renamed to `.cjs`); `eslint-config-next`'s
  parser doesn't satisfy typescript-eslint's parser-services check and
  doesn't track type-only-import usage the same way (reordered config,
  disabled Next's redundant build-time lint pass instead)
- `packages/types`, `packages/utils`, `packages/config`,
  `packages/database` implemented for real (not placeholders);
  `packages/auth` given placeholder exports (signatures only, throw
  "not implemented"); `packages/ui` given a single empty file so the
  workspace-wide build/type-check gates pass (still out of scope)
- `apps/server`: Hono + `@hono/zod-openapi`, request-ID middleware,
  centralized error handler, fail-fast env, `GET /health` +
  `GET /openapi.json` + `GET /docs` — verified by actually running the
  dev server and hitting each endpoint, and separately by running a
  real production build (`tsc` → `node dist/index.js`) and confirming
  `/health` still works with JSON (not pretty) logs
- `apps/web`: Next.js App Router + Tailwind + shadcn/ui (one hand-added
  primitive, since this environment can't run the CLI's interactive
  registry fetch) + TanStack Query provider — verified via a real
  `next build` and `next start`, inspecting the actual rendered HTML
- ADR-0020 (logging), ADR-0021 (configuration), ADR-0022 (error
  handling)
- Full quality-gate suite (`lint`, `type-check`, `build`,
  `format:check`) verified green from a clean `node_modules`, not
  assumed from config alone

Decisions

- pino for logging (ADR-0020)
- Zod-validated fail-fast config loading (ADR-0021)
- Typed `AppError` hierarchy + centralized HTTP error mapping (ADR-0022)

Problems

- No live PostgreSQL instance available in this environment —
  `packages/database`'s connection/migrate/seed code type-checks and
  `drizzle-kit generate` runs against the empty schema, but actual
  connectivity is unverified
- CI has only been verified via local equivalents of its jobs, not an
  actual GitHub Actions run
- Milestone 0.2 still blocked: real product docs not yet received
- One commit (`fix(eslint): ignore next-env.d.ts globally`) ended up
  bundling the full `apps/web` implementation too — a failed pre-commit
  hook's stash-revert left files staged from a prior attempt. Content
  is correct and verified; only the commit message undersells scope

Next

- Get a real PostgreSQL instance connected and verify `apps/server`
  against it
- Verify CI on an actual GitHub Actions run
- Add automated dependency-boundary enforcement before Milestone 1.0
  (see ADR-0019)
- Still pending: real product docs, founder review of Milestone 0.4
  architecture docs
- Begin Milestone 1.0 once 0.2/0.3/0.4/0.5 are all actually closed out

---

## 2026-07-27

Milestone 0.7

Completed

- Composition root (container.ts) wiring every Milestone 0.6
  repository/infra/service factory, unmodified
- Auth middleware (Bearer access token) and rate-limit middleware
  (register 5/hr/IP, login 10/15min/IP)
- All 9 endpoints implemented: POST /auth/{register,login,logout,
  refresh,change-credential,trust-device}, DELETE /auth/trust-device/
  :id, GET /auth/{me,devices} -- routes (OpenAPI schemas) and
  controllers (HTTP translation) as separate files, full OpenAPI docs
  live at /docs and /openapi.json
- Cookie-based refresh transport (httpOnly, /auth-scoped), access
  token in the JSON response body
- Selected Vitest as the workspace test runner (open since Milestone
  0.3); 16 real integration tests covering every endpoint plus edge
  cases, all passing -- pnpm test is no longer a no-op
- ADR-0025 resolved (not superseded): internal code keeps
  "credential", user-facing UI will say "PIN" once one exists, DB
  fields unchanged, digit range stays 4-8
- Two minimal, additive-only exceptions to "repositories/services are
  stable": DeviceRepository.findAllByUserId (no existing method could
  list a user's devices for GET /auth/devices) and
  TooManyRequestsError/TOO_MANY_REQUESTS added to packages/utils/
  packages/types (shared infra, not Identity code)
- Closed a real authorization gap without modifying the repository:
  TrustedDeviceRepository.revoke(id) has no ownership check, so
  DELETE /auth/trust-device/:id requires deviceId as a query param and
  verifies it via the existing findActiveByUserAndDevice before
  revoking
- Docs updated: Authentication.md (new HTTP API section, resolved
  terminology note, rate limiting section corrected), Session-
  Management.md (Transport section: planned -> implemented), PRD,
  CLAUDE.md, ROADMAP.md (0.6 marked Complete), this entry, CHANGELOG.md

Decisions

- register auto-logs-in by calling registerUser then login with the
  same submitted credential (both untouched use cases) rather than
  adding session issuance to registerUser itself
- Access token in response body, refresh token as httpOnly cookie --
  the plan documented in Milestone 0.6 is now shipped behavior

Problems

- Real type bug caught by tsc: deviceLabel could be undefined from the
  Zod schema but services require string | null -- fixed with an
  explicit ?? null normalization at both call sites
- Two genuine implementation gaps found while building the HTTP layer
  that the "treat repositories as stable" instruction didn't leave a
  clean way to satisfy: no method to list a user's devices, and no
  ownership check on trust-grant revocation. Resolved with a minimal
  additive method and a controller-side ownership check respectively,
  both flagged explicitly rather than silently worked around
- Domain-layer unit tests and live-database repository tests still
  don't exist -- current coverage is HTTP-integration-level only,
  against in-memory fakes (same limitation as Milestone 0.6, now
  formalized as committed tests instead of manual scripts)
- Still no live PostgreSQL instance available in this environment

Next

- Expand test coverage to the domain layer directly and to real-
  database repository tests
- Verify against a live PostgreSQL instance
- Move the in-memory rate limiter to a shared store before horizontal
  scaling
- Still pending: real product docs, founder review of architecture
  docs and the PRD, automated dependency-boundary enforcement
- Begin Milestone 1.0 (PINChat MVP) once 0.2 through 0.7 are all
  actually closed out

---

## 2026-07-25

Milestone 0.6

Completed

- Drizzle schema for Identity: users, devices, trusted_devices,
  sessions, refresh_tokens, login_attempts, audit_events -- migration
  generated, SQL inspected directly
- Domain layer: Username/Credential value objects, entities, session
  lifetime + lockout rules, typed domain errors
- Infrastructure: Argon2id hashing, JWT access tokens, opaque rotating
  refresh tokens, in-memory rate limiter, audit writer -- each
  verified by compiling and running it directly, not just type-checked
- Repositories: one per entity, Drizzle-backed
- Application layer: register/login/logout/refresh (rotation + reuse
  detection)/revoke-session/trust-device/change-credential use cases,
  validation schemas, output DTOs -- verified end-to-end against
  in-memory fake repositories, every flow including the reuse-
  detection-kills-the-whole-session edge case
- Root-caused and fixed a reproducible tsc build race that had been
  worked around ad hoc for two milestones: tsBuildInfoFile defaults to
  living next to tsconfig.json, not inside outDir, so `rm -rf dist`
  never invalidated the incremental cache and tsc silently skipped
  re-emitting some files. Fixed by co-locating tsBuildInfoFile with
  dist/ in every package tsconfig
- docs/security/Authentication.md, Session-Management.md,
  docs/database/Identity-Schema.md
- ADR-0023 (identity domain model), ADR-0024 (session strategy),
  ADR-0025 (credential authentication)

Decisions

- Identity is a separate bounded context from PINChat's session-code,
  not overloaded terminology (ADR-0023)
- Two-token session strategy: short-lived stateless JWT access token +
  rotating opaque refresh token with reuse detection (ADR-0024)
- Argon2id for credential hashing, generic login failure messages to
  avoid username enumeration (ADR-0025)

Problems

- Real, reproducible tsc build race root-caused and fixed (see above)
- Phantom dependency caught by pnpm's strict isolation: apps/server
  imported drizzle-orm directly but never declared it, only reachable
  transitively through packages/database -- fixed
- Unresolved: a later instruction reintroduced "PIN" terminology and a
  4-6 digit range, directly conflicting with the earlier explicit
  instruction to use "credential" and the already-implemented,
  tested 4-8 digit range. Flagged in ADR-0025 and the PRD's Open
  Questions rather than silently picking one -- needs a founder
  decision before Milestone 1.0 depends on this system
- No HTTP/API layer built yet for Identity -- explicitly deferred
- No committed automated test suite yet -- verified via manual scripts
  against in-memory fakes, not CI-run tests
- Never verified against a live PostgreSQL instance -- none available
  in this environment

Next

- Resolve the credential/PIN naming conflict
- Build the Identity HTTP/API layer (routes, controllers, OpenAPI,
  auth middleware)
- Select a test runner, write real committed tests for Identity
- Verify against a live PostgreSQL instance
- Founder review of the new Product Requirements Document

---

## 2026-07-24

Milestone 0.4

Completed

- System-Architecture.md: modular monolith + Clean Architecture +
  platform/product split, dependency direction, system diagram,
  validation pass (circular deps, scalability, testability, future
  products, DX) with identified risks
- Package-Architecture.md: exact responsibility for each of the six
  packages, "shared, not product-specific" rule, add-a-package process
- Dependency-Rules.md: full import matrix, backend/frontend layer
  rules, one documented exception (auth -> database), enforcement gap
  flagged (code review only, no automated check yet)
- Backend-Architecture.md: routes/controllers/services/domain/
  repositories/infrastructure/middleware/validation/websocket/jobs/
  events, with diagram
- Frontend-Architecture.md: app/layouts/features/components/hooks/
  services/stores/lib/providers/assets, with diagram
- Expanded coding-standards.md: folder/file naming, barrel export
  policy (public API boundary only), import ordering, error handling,
  logging, comments, expanded testing conventions mapped to the new
  layers
- ADR-0017 (overall architecture), ADR-0018 (package boundaries),
  ADR-0019 (dependency rules)

Decisions

- Modular monolith + Clean Architecture + platform/product split
  (ADR-0017)
- Six fixed packages, justification required to add more (ADR-0018)
- Enforced import matrix, currently review-only (ADR-0019)

Problems

- No automated enforcement of dependency rules yet — nothing fails CI
  if a future PR violates the import matrix. Flagged as a pre-1.0
  requirement, not yet scheduled with a milestone.
- Architecture is unverified against real code — no application code
  exists yet, so layer boundaries (e.g. domain/ zero-infra-deps) are
  design intent only.
- Milestones 0.2 and 0.3 still open (real product docs not received;
  workspace install not verified) — 0.4 proceeded in parallel per
  explicit instruction, not because those blockers cleared.

Next

- Founder review/sign-off on all five Milestone 0.4 architecture docs
- Add eslint-plugin-boundaries (or equivalent) before Milestone 1.0
  implementation starts
- Still pending: real product docs, verified pnpm install/CI
- Begin Milestone 1.0 once 0.2/0.3/0.4 are all actually closed out

---

## 2026-07-24

Milestone 0.3

Completed

- pnpm workspace scaffold: `apps/{web,server}`, `packages/{ui,config,
types,utils,database,auth}`, `tooling/{typescript-config,eslint-config,
prettier-config}` — structure and config only, no feature code
- Root TypeScript project references, strict ESLint, Prettier,
  EditorConfig
- Husky pre-commit/commit-msg hooks, lint-staged, Commitlint
- Turborepo task pipeline; environment variable strategy doc +
  per-app `.env.example`
- `.github/` scaffold: issue/PR templates, CODEOWNERS, Dependabot, CI
  workflow (lint/type-check/test/build/docs-validate, no deploy job)
- Added Engineering Journal itself (this file)

Decisions

- Turborepo (ADR-0015)
- pnpm workspaces (ADR-0016)

Problems

- Workspace has not actually been installed or run — `pnpm install`
  not executed in this environment, CI not yet verified against a real
  PR. Treat all tooling as unverified until confirmed.
- Milestone 0.2 still blocked: product docs under `docs/product/` are
  assistant-authored drafts, not the founder's real specification —
  corrected by the founder (2026-07-23) but real documents not yet
  received.

Next

- Get `pnpm install` run and CI verified green
- Receive and swap in real product documents (highest priority)
- Deploy pipelines to Railway/Vercel (deliberately deferred, not part
  of 0.3)
- Begin Milestone 1.0 once 0.2 and 0.3 are both actually closed out

---

## 2026-07-22

Milestone 0.1

Completed

- Repository scaffold (root standards files, .gitignore)
- `/docs` directory structure (11 areas)
- ADR system + ADR-0001 (project/documentation structure)
- CLAUDE.md, ROADMAP.md, CHANGELOG.md
- Engineering coding standards document

Decisions

- ADR-0001: docs/adr system, CLAUDE.md as persistent memory

Problems

- None

Next

- Draft product documentation
- Define architecture direction and tech stack

---

## 2026-07-22

Milestone 0.2

Completed

- Architecture overview (principles, boundaries, future modules)
- Tech stack decision summary
- ADR-0002 through ADR-0014 (full technology stack)
- Root navigation files: BLUEPRINT.md, ARCHITECTURE.md, DECISIONS.md,
  TODO.md
- Product Documentation Policy added to CLAUDE.md (freeze `/docs/product`
  against silent AI rewrites)

Decisions

- Monorepo (ADR-0002)
- Next.js (ADR-0003)
- Hono (ADR-0004)
- PostgreSQL (ADR-0005)
- Drizzle (ADR-0006)
- Tailwind (ADR-0007)
- shadcn/ui (ADR-0008)
- Zustand (ADR-0009)
- TanStack Query (ADR-0010)
- Cloudflare R2 (ADR-0011)
- Railway (ADR-0012)
- Vercel (ADR-0013)
- TypeScript (ADR-0014)

Problems

- Ephemeral session data store vs. PostgreSQL — unresolved (see
  ADR-0005 Future Implications)
- Product docs were initially drafted from an assistant-authored guess
  rather than the founder's actual approved documents — corrected;
  awaiting real documents to replace the drafts before Milestone 0.2
  can be marked complete

Next

- Replace draft product docs with approved v1.0.0 documents
- Founder review of architecture docs
- Begin Milestone 0.3 (tooling & CI)
