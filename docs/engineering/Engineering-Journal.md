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

## 2026-08-13

Milestone 1.0 — Security Hardening (WebSocket Authentication)

Completed

- Replaced query-string access-token WebSocket authentication
  (`?access_token=`, flagged as unacceptable for a privacy-first
  platform -- URLs are logged/retained far more readily than headers)
  with a short-lived (30s), single-use, database-backed WS ticket:
  `POST /auth/ws-ticket` (requireAuth-gated, unchanged) issues a
  32-byte random ticket, hash-at-rest only, consumed exactly once via
  the same atomic conditional UPDATE pattern already proven for
  refresh-token rotation and BlueMoon Token consumption
- New `ws_tickets` table (migration 0003_dashing_network.sql):
  session_id FK cascade, user_id, device_id, ticket_hash (unique),
  expires_at, consumed_at; domain/infrastructure/repository/service
  layers follow Identity's existing conventions, deliberately kept in
  a separate module from refresh-token.ts (same reasoning as
  blue-moon-token.ts)
- requireWsAuth rewritten to consume a ticket instead of verifying an
  access token; old ?access_token= scheme no longer authenticates
  anything -- treated identically to a missing ticket
- apps/web WS client (api-client.ts, use-messaging-socket.ts) updated
  to fetch a fresh ticket before every connection attempt, including
  reconnects; tickets never logged
- Fake-container WS test suite rewritten for the ticket flow plus new
  coverage: expired ticket, consumed-ticket reuse, concurrent-use
  exactly-one-winner, rejection of the old access_token scheme --
  pnpm test still database-free, now higher than the prior 53/53
  baseline
- New ws-ticket.repository.integration.test.ts (real Postgres):
  valid-consume, expired, unknown-hash, double-consume,
  concurrent-exactly-one-winner -- mirrors
  consumeTokenAndCreateFriendship's test structure; connection.integration.test.ts
  updated to the ticket flow; pnpm test:db still >= prior 59/59
  baseline
- ADR-0030 (ticket authentication design, alternatives considered --
  refresh cookie rejected due to /auth path scope + SameSite=Lax
  cross-origin risk); ADR-0028 amended in place (auth sub-decision
  superseded, rest unchanged, not rewritten); Messaging.md,
  docs/api/README.md, Phase-1.0.md, DECISIONS.md updated

Decisions

- ADR-0030: dedicated WS ticket, not a reused refresh cookie and not a
  general-purpose token -- narrowly scoped to the WS handshake only

Problems

- None blocking; existing refresh-token cookie confirmed unsuitable
  for direct reuse (path=/auth scoping, SameSite=Lax cross-origin
  reliability) without itself weakening cookie security, which the
  task explicitly forbade -- documented as a rejected alternative in
  ADR-0030 rather than silently worked around

Next

- Real PINChat V1 session/PIN model and real E2EE remain unscheduled,
  unaffected by this hardening pass

---

## 2026-08-10

Milestone 1.0

Completed

- Phase 1 inspection found two genuine, material conflicts between
  the task brief and canonical product docs before any implementation
  code was written: friendship-gated messaging vs. ROADMAP.md's
  session/PIN Milestone 1.0 checklist and Architecture-Overview.md's
  "identity is additive, never a precondition" principle; required
  E2EE vs. no encryption design existing anywhere in the codebase.
  Reported per the Product Documentation Policy rather than resolved
  silently; founder chose "friendship-gated now, session/PIN later"
  and "defer E2EE, document the gap honestly" via explicit decisions
- conversations, messages Drizzle schema + migration
  (0002_far_elektra.sql), verified against a fresh PostgreSQL
  instance: canonical-pair check constraint (same pattern as
  friendships), both participant FKs cascade, sender_id is ON DELETE
  SET NULL (attribution, not ownership -- messages.content is
  plaintext, flagged inline pending ADR-0029)
- Messaging domain/infrastructure/repository/application/HTTP layers
  (apps/server/src/{domain,infrastructure,repositories,services,
  routes,controllers}/messaging), following Identity's/Social's
  conventions; PresenceRegistry + MessageBroadcaster in-memory,
  single-process, same documented limitation as the rate limiter
- @hono/node-server bumped 1.13.7 -> 2.1.0 for native
  upgradeWebSocket (the installed 1.x version has no WebSocket
  support at all -- confirmed by inspecting its type declarations
  before deciding to bump); requireWsAuth middleware authenticates
  via ?access_token= query parameter (browsers can't set custom
  headers during a WS handshake)
- messaging-container.ts composition root; app.ts mounts
  /messaging/* HTTP routes and the /messaging/ws WebSocket route,
  plus a new cors() middleware (WEB_ORIGIN env var) required for
  apps/web to call the API cross-origin for the first time
- Persist-then-broadcast message delivery: written to Postgres first,
  broadcast to both participants' connections afterward, best-effort
  and non-throwing -- a disconnected recipient never loses the
  message, only the real-time push
- Minimal Next.js frontend: Zustand auth store, typed API client, WS
  hook with auto-reconnect, login/register pages, conversation
  sidebar (friend list -> start conversation), active-conversation
  view (history, composer, sending state, presence dot)
- 10 fake-container HTTP tests + 9 fake-container WebSocket tests (a
  new real-listening-TCP-server test harness, ws-test-server.ts,
  since app.request() can't exercise a WS upgrade) -- pnpm test stays
  database-free at 53/53 (34 Identity/Social + 19 Messaging)
- 13 real-Postgres repository tests + 5 HTTP tests + 2 WebSocket
  tests -- pnpm test:db at 59/59
- Full golden path verified live in a real browser (next build + next
  start) against a real server (tsc build + node dist/index.js) and a
  real disposable PostgreSQL instance: two accounts registered,
  befriended, started a conversation, and exchanged messages with
  real-time bidirectional delivery and live presence, confirmed
  without a page reload
- ADR-0027 (friendship-gate deviation), ADR-0028 (WebSocket
  architecture), ADR-0029 (E2EE deferral)
- Full quality gate green: install, build, lint, type-check,
  format:check, test (53/53), test:db (59/59)
- Docs updated: Phase-1.0.md (new), Messaging-Schema.md (new),
  Messaging.md (new), docs/api/README.md (populated from an empty
  placeholder), CLAUDE.md, ROADMAP.md (Milestone 1.0 added as the
  interim slice, the canonical PINChat MVP renumbered to 1.1), TODO.md,
  CHANGELOG.md, DECISIONS.md, this entry, docs/database/README.md,
  docs/security/README.md, PRD status note

Decisions

- Friendship-gated messaging is an explicit interim deviation from the
  canonical session/PIN model, not a redesign of it -- ADR-0027
  documents the deviation and leaves the real session/PIN model's
  relationship to it as an open future question, not decided here
- No E2EE implemented; plaintext storage and TLS-only transport
  documented honestly as a known gap (ADR-0029) rather than faked with
  partial/invented cryptography, per the task's own explicit
  instruction not to do so
- HTTP for reads and conversation creation, WebSocket exclusively for
  sending -- no redundant HTTP send-message endpoint (ADR-0028)
- Per-user WebSocket connections, not per-conversation -- avoids a
  stateful subscribe/unsubscribe protocol; authorization computed
  server-side from row data at broadcast time, same as HTTP
- ConversationRepository.findOrCreateForUsers reuses the INSERT ...
  ON CONFLICT DO NOTHING + fallback SELECT technique from Social's
  token consumption, but for the opposite concurrency reason: every
  concurrent caller should succeed with the identical row, not race
  to be the sole winner

Problems

- Real bug, found during browser verification: zustand persist's
  localStorage rehydration is asynchronous; the chat layout's original
  auth guard redirected to /login on the pre-hydration null token,
  briefly bouncing an already-logged-in user on every fresh page load.
  Fixed with an explicit hasHydrated flag gating the redirect decision
- Initially suspected bug, disproven on investigation: CORS preflight
  OPTIONS requests appearing to exhaust Identity's registration rate
  limit. Root cause was a stale, never-successfully-replaced server
  process from earlier manual testing still bound to the port after
  later restarts silently failed to bind -- not a real CORS/rate-limit
  interaction (hono's cors() middleware short-circuits OPTIONS before
  the rate limiter ever runs, confirmed empirically)

Next

- Design the real PINChat V1 session/PIN model (Milestone 1.1) and
  its relationship to Milestone 1.0's interim friendship-gated
  messaging
- Design and implement real end-to-end encryption
- Add rate limiting to Messaging
- Expand domain-layer unit test coverage (Identity + Messaging)
- Add automated dependency-rule enforcement

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

## 2026-08-09

Milestone 0.8

Completed

- docker-compose.yml: local disposable PostgreSQL for development and
  integration testing
- Real-database test harness (apps/server/src/test-utils/real-db.ts):
  TEST_DATABASE_URL/DATABASE_URL detection, identity-table reset
  between tests
- vitest.integration.config.ts + vitest.config.ts exclusion, so real-
  database tests never run under plain `pnpm test`; new opt-in
  `pnpm test:db` script (root, apps/server, turbo.json)
- 15 repository-level integration tests: unique username/token-hash
  constraints, FK rejection, device unique(user,fingerprint), cascade
  delete on user deletion, trusted-device/session/login-attempt/audit
  round-trips, 20-way concurrent-query pooling test
- 6 HTTP-level integration tests reusing the exact createApp/routes/
  controllers/services code with a real Drizzle-backed container
  instead of the in-memory fake: registration + duplicate rejection,
  5-attempt lockout, refresh rotation + reuse detection, trust-device,
  change-credential, logout
- Migration (0000_lame_deadpool.sql) verified to apply cleanly to a
  fresh database; confirmed via psql: 7 tables, 5 FKs with designed
  CASCADE/SET NULL behavior, both unique constraints, all 13 indexes
- Full quality gate re-verified green after all changes: install,
  build, lint, type-check, test (16/16, unchanged), format:check
- Docs updated: Phase-0.8.md (new), Session-Management.md (Concurrent
  Rotation section), Identity-Schema.md (verification note), CLAUDE.md,
  ROADMAP.md (0.5/0.7 marked Complete, 0.8 added), TODO.md,
  CHANGELOG.md, this entry, apps/server/.env.example

Decisions

- Real-database tests split into a separate `*.integration.test.ts`
  naming convention + separate vitest config, rather than adding
  environment-detection skip logic to the existing test files --
  keeps `pnpm test` unconditionally database-free (needed for CI,
  which provisions no Postgres service) without any risk of an
  integration test accidentally running there
- Fixed the refresh-token rotation race with an atomic conditional
  UPDATE (WHERE revoked_at IS NULL ... RETURNING) rather than wrapping
  the service-layer rotation in an explicit db.transaction() -- the
  repository/service dependency-injection boundary (services depend on
  repository interfaces, not a raw db handle) would have needed
  restructuring to thread a transaction through; the atomic update
  achieves the same correctness guarantee for this specific race with
  a much smaller, purely additive change

Problems

- Real correctness bug found by real-Postgres testing that the in-
  memory fakes structurally could not have caught: two concurrent
  refresh requests presenting the same still-active token could both
  pass the active check and both rotate it (RefreshTokenRepository
  .revoke(id) was an unconditional UPDATE), producing two valid
  children of one parent token and defeating the single-child-per-
  parent invariant reuse detection depends on
- Initial integration-test bug (test code, not product code): default
  generated usernames used a raw UUID, exceeding users.username's
  varchar(20) -- caught immediately by the first real-Postgres test
  run

Next

- Domain-layer unit tests (pure Username/Credential/session-lifetime/
  lockout-policy tests) -- still open, not addressed this milestone
- Automated dependency-rule enforcement (eslint-plugin-boundaries)
- Still pending: real product docs, founder review of architecture
  docs, PRD, and Milestone 0.4 documents
- Milestone 0.9 (Social/Friendship + BlueMoon Token) per current
  founder direction -- not yet scoped in this repository's ROADMAP.md

---

## 2026-08-09

Milestone 0.9

Completed

- blue_moon_tokens, friendships Drizzle schema + migration
  (0001_amusing_the_executioner.sql), verified against a fresh
  PostgreSQL instance: all constraints, FKs, unique constraints, the
  canonical-pair check constraint, and indexes confirmed via psql
- Social domain layer (apps/server/src/domain/social): BlueMoonToken/
  Friendship entities, canonicalizePair/otherParticipant helpers,
  BLUE_MOON_TOKEN_TTL_MS = 300_000, typed errors deliberately generic
  where anti-enumeration matters
- Social infrastructure (apps/server/src/infrastructure/social):
  token generation/hashing -- same pattern as refresh tokens (32
  random bytes, SHA-256) but a separate module, per the product
  requirement that this is not authentication infrastructure -- plus
  a dedicated audit writer
- Social repositories (apps/server/src/repositories/social):
  BlueMoonTokenRepository (creation only) and FriendshipRepository,
  including consumeTokenAndCreateFriendship -- one atomic conditional
  UPDATE (WHERE consumed_at IS NULL AND expires_at > now()) plus an
  ON CONFLICT DO NOTHING friendship insert, both inside one
  db.transaction()
- Social application services (apps/server/src/services/social):
  generate (owner always from the session), consume (resolves
  username, rejects self-consumption before touching the database,
  one generic error for every failure mode), list, remove
- social-container.ts composition root; app.ts refactored to build
  one shared Database instance for both Identity and Social
  containers instead of two connection pools
- 4 HTTP endpoints (routes/social, controllers/social): POST
  /social/blue-moon-tokens, POST /social/friendships, GET
  /social/friendships, DELETE /social/friendships/{id} -- reuses
  Identity's requireAuth unmodified, rate limited
- 18 fake-container HTTP tests (friendships.routes.test.ts) -- pnpm
  test stays database-free at 34/34 (16 Identity + 18 Social)
- 14 real-Postgres repository tests + 4 real-Postgres HTTP tests --
  pnpm test:db at 39/39, including a concurrent-consumption test
  (two simultaneous requests for the same token) proving exactly one
  succeeds, both at the repository level and through the HTTP API
- ADR-0026 (BlueMoon Token: atomic single-use consumption, separate
  from auth infrastructure)
- Full quality gate green: install, build, lint, type-check,
  format:check, test (34/34), test:db (39/39, run twice independently
  with identical results)
- Docs updated: Phase-0.9.md (new), Social-Schema.md (new), Social.md
  (new), CLAUDE.md, ROADMAP.md, TODO.md, CHANGELOG.md, DECISIONS.md,
  this entry, docs/database/README.md, docs/security/README.md, PRD
  status note

Decisions

- Consumption lives on FriendshipRepository, not split across
  BlueMoonTokenRepository and a service-layer transaction -- "consume
  the token" and "create the friendship" must succeed or fail
  together, and keeping that atomicity inside one repository method
  avoided restructuring the service/repository dependency-injection
  boundary (see the equivalent tradeoff noted in Milestone 0.8)
- Both friendship participants must already be BlueMoon accounts --
  resolves PRD Open Question #4 by the only interpretation the
  current codebase supports (no PINChat/session-only account concept
  exists yet), recorded in ADR-0026 rather than silently assumed
- If already friends, a validly consumed token still gets marked
  consumed (ON CONFLICT DO NOTHING on the friendship insert) rather
  than treated as an error -- the token was legitimately redeemed

Problems

- Real bug: Hono's app.use(path, middleware) matches every HTTP
  method on that path -- naive wiring would have rate-limited GET
  /social/friendships (list) using the POST (consume) quota
- Test-authoring bugs (not product bugs): a Response body read twice
  in one test, and a test that accidentally used a consumer's own
  username as the target, exercising the self-friendship rejection
  path instead of the intended "unknown username" path -- same
  category as Milestone 0.8's username-length mistake, caught
  immediately by the first fake-container test run

Problems Solved

- Fixed with a small onlyForMethod middleware wrapper scoping the
  rate limiter to POST only
- Fixed by reading the already-parsed body instead of re-reading the
  Response, and by registering a distinct third username for the
  "unknown username" test case

Next

- Domain-layer unit tests (pure Username/Credential/session-lifetime/
  lockout-policy/BlueMoon-Token-lifetime tests) -- still open
- Automated dependency-rule enforcement (eslint-plugin-boundaries)
- Still pending: real product docs, founder review of architecture
  docs and the PRD
- Milestone 1.0 (PINChat MVP) once Milestones 0.2 and 0.4 (founder
  sign-off) are resolved -- not started as part of this milestone

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
