# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Repository scaffold: `.gitignore`, `README.md`, `LICENSE` (placeholder),
  `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`.
- `CLAUDE.md` persistent engineering memory file.
- `ROADMAP.md` progress tracking file.
- `/docs` directory structure (architecture, product, engineering,
  security, backend, frontend, api, database, deployment, adr,
  meeting-notes).
- ADR system with ADR-0001 (project structure).
- Engineering coding standards document.
- Draft v1 product documentation: literature survey, product blueprint,
  product vision & philosophy, user personas & research, user journey &
  flow specification — cross-linked, pending founder review.
- `docs/architecture/Architecture-Overview.md` (principles, system
  boundaries, future modules, design philosophy).
- `docs/architecture/Tech-Stack-Decision.md` summarizing the full stack.
- ADR-0002 through ADR-0014: monorepo, Next.js, Hono, PostgreSQL,
  Drizzle, Tailwind, shadcn/ui, Zustand, TanStack Query, Cloudflare R2,
  Railway, Vercel, TypeScript.
- Root navigation files: `BLUEPRINT.md`, `ARCHITECTURE.md`,
  `DECISIONS.md`, `TODO.md`.
- Product Documentation Policy in `CLAUDE.md` (freezes `/docs/product`
  against silent AI rewrites).
- `docs/engineering/Engineering-Journal.md` — chronological
  per-milestone log.
- pnpm workspace: `apps/{web,server}`,
  `packages/{ui,config,types,utils,database,auth}`,
  `tooling/{typescript-config,eslint-config,prettier-config}` —
  structure and configuration only, no application code.
- Root `tsconfig.json` (project references), ESLint, Prettier,
  `.editorconfig`.
- Husky pre-commit/commit-msg hooks, lint-staged, Commitlint.
- `turbo.json` Turborepo pipeline (ADR-0015); pnpm workspaces formally
  recorded as ADR-0016.
- `docs/engineering/environment-strategy.md` + per-app `.env.example`
  (`apps/web`, `apps/server`).
- `.github/`: issue templates, PR template, `CODEOWNERS`,
  `dependabot.yml`, CI workflow skeleton (lint, type-check, test,
  build, docs-validate — no deployment job).
- `docs/architecture/System-Architecture.md`: overall style (modular
  monolith, Clean Architecture, platform/product split), dependency
  direction, boundaries, system diagram, validation/risks pass.
- `docs/architecture/Package-Architecture.md`: exact responsibility for
  each of the six `packages/*`, package-addition justification process.
- `docs/architecture/Dependency-Rules.md`: full import matrix, backend/
  frontend layer rules, enforcement status.
- `docs/architecture/Backend-Architecture.md`: `apps/server` layers
  (routes through events) with diagram.
- `docs/architecture/Frontend-Architecture.md`: `apps/web` layers (app
  router through assets) with diagram.
- ADR-0017 (overall architecture), ADR-0018 (package boundaries),
  ADR-0019 (dependency rules).
- `packages/types`: `Environment`, `ApiResponse<T>`, typed `ErrorCode`/
  `ApiErrorBody`, `HealthCheckResponse`.
- `packages/utils`: pino-based `createLogger`/`withRequestId`, date/id
  helpers, `Result<T, E>`, `AppError` class hierarchy.
- `packages/config`: Zod `baseEnvSchema`/`extendEnvSchema`, fail-fast
  `loadEnv()`.
- `packages/database`: Drizzle + `postgres.js` connection, migration
  config, seed entry point, `checkDatabaseConnection()` — no business
  schema.
- `packages/auth`: placeholder exports (`createSession`/`joinSession`/
  `expireSession`, all throw "not implemented").
- `apps/server`: working Hono app — `@hono/zod-openapi`, request-ID
  middleware, centralized error handler, `GET /health`,
  `GET /openapi.json`, `GET /docs`.
- `apps/web`: working Next.js App Router app — Tailwind + shadcn/ui
  token setup and one primitive (`Button`), TanStack Query provider.
- ADR-0020 (logging), ADR-0021 (configuration), ADR-0022 (error
  handling).
- Identity domain schema in `packages/database`: `users`, `devices`,
  `trusted_devices`, `sessions`, `refresh_tokens`, `login_attempts`,
  `audit_events` (migration generated, not yet applied to a live DB).
- Identity domain layer in `apps/server`
  (`src/domain/identity`): `Username`/`Credential` value objects,
  entities, session-lifetime + lockout rules, typed domain errors.
- Identity infrastructure (`src/infrastructure/identity`): Argon2id
  hashing, JWT access tokens, opaque rotating refresh tokens, in-memory
  rate limiter, audit writer.
- Identity repositories (`src/repositories/identity`): one per entity.
- Identity application layer (`src/services/identity`): register,
  login, logout, refresh-session (rotation + reuse detection),
  revoke-session, trust-device/revoke-device-trust, change-credential
  use cases; Zod validation schemas (`src/validation/identity`); output
  DTOs stripping internal user fields.
- `docs/security/Authentication.md`, `Session-Management.md`,
  `docs/database/Identity-Schema.md`.
- ADR-0023 (identity domain model), ADR-0024 (session strategy),
  ADR-0025 (credential authentication).
- Identity HTTP/API layer (Milestone 0.7): composition root
  (`container.ts`), auth + rate-limit middleware
  (`middleware/identity`), all 9 `/auth/*` endpoints (register, login,
  logout, refresh, change-credential, trust-device, revoke-device-trust,
  me, devices) as routes (`routes/identity`) + controllers
  (`controllers/identity`), cookie-based refresh transport
  (`infrastructure/identity/cookies.ts`), client-IP extraction
  (`infrastructure/identity/client-ip.ts`).
- `TooManyRequestsError`/`TOO_MANY_REQUESTS` in `packages/utils`/
  `packages/types` (additive, for rate-limited endpoints).
- `DeviceRepository.findAllByUserId` (additive, backs `GET /auth/devices`).
- Vitest selected as the workspace test runner; 16 real integration
  tests for the Identity HTTP API
  (`apps/server/src/routes/identity/auth.routes.test.ts`) plus a
  reusable in-memory fake-repository test harness
  (`apps/server/src/test-utils/fake-identity-container.ts`).
- Milestone 0.8: `docker-compose.yml` (local disposable PostgreSQL),
  real-database test harness (`apps/server/src/test-utils/real-db.ts`),
  `apps/server/vitest.integration.config.ts`, and a new opt-in
  `pnpm test:db` script (root + `apps/server` + `turbo.json`),
  deliberately kept separate from `pnpm test`.
- 15 real-PostgreSQL repository integration tests
  (`apps/server/src/repositories/identity/identity-repositories.integration.test.ts`):
  unique/FK/index constraints, CRUD round-trips, cascade delete on
  user deletion, refresh-token concurrent-revoke behavior, connection-
  pool concurrency.
- 6 real-PostgreSQL HTTP integration tests
  (`apps/server/src/routes/identity/auth.routes.integration.test.ts`):
  registration/duplicate-username, lockout, refresh rotation + reuse
  detection, trust-device, change-credential, logout.
- Milestone 0.9: Social bounded context. `blue_moon_tokens` and
  `friendships` Drizzle schema + migration; domain entities/errors/
  rules (`apps/server/src/domain/social`); infrastructure for
  cryptographically random token generation/hashing, deliberately
  separate from Identity's auth-token infrastructure
  (`apps/server/src/infrastructure/social`); repositories including
  the atomic transactional `consumeTokenAndCreateFriendship`
  (`apps/server/src/repositories/social`); application services for
  generate/consume/list/remove (`apps/server/src/services/social`);
  `apps/server/src/social-container.ts` composition root.
- 4 new Social HTTP endpoints: `POST /social/blue-moon-tokens`,
  `POST /social/friendships`, `GET /social/friendships`,
  `DELETE /social/friendships/{id}` — OpenAPI-documented,
  authenticated (reuses Identity's `requireAuth`), rate limited.
- 18 fake-container Social HTTP tests
  (`apps/server/src/routes/social/friendships.routes.test.ts`) plus a
  reusable in-memory fake (`apps/server/src/test-utils/fake-social-container.ts`).
- 14 real-PostgreSQL Social repository tests
  (`apps/server/src/repositories/social/social-repositories.integration.test.ts`)
  and 4 real-PostgreSQL Social HTTP tests
  (`apps/server/src/routes/social/friendships.routes.integration.test.ts`),
  including a concurrent-token-consumption test proving exactly one
  request succeeds.
- ADR-0026: BlueMoon Token atomic single-use consumption, kept
  separate from authentication infrastructure.
- `docs/database/Social-Schema.md`, `docs/security/Social.md`,
  `docs/phases/Phase-0.9.md`.
- `conversations`, `messages` Drizzle schema + migration
  (`0002_far_elektra.sql`), verified against a fresh PostgreSQL
  instance.
- Messaging domain/application/infrastructure/repository/HTTP/
  WebSocket layers (`apps/server/src/{domain,services,infrastructure,
repositories,routes,controllers,validation,websocket}/messaging`),
  following Identity's and Social's conventions.
- In-memory `PresenceRegistry` and `MessageBroadcaster`
  (`infrastructure/messaging/`) — single-process, same documented
  limitation as the existing rate limiter.
- 3 new Messaging HTTP endpoints: `POST /messaging/conversations`,
  `GET /messaging/conversations`,
  `GET /messaging/conversations/{id}/messages` — OpenAPI-documented,
  authenticated (reuses Identity's `requireAuth`), friendship-gated
  conversation creation.
- Authenticated per-user WebSocket connection at `GET /messaging/ws`
  (query-string access-token auth via a new `requireWsAuth`
  middleware); `send_message`/`message`/`error` event contract — see
  `docs/api/README.md`.
- `hono/cors` middleware + `WEB_ORIGIN` env var — the first time
  `apps/server` accepts cross-origin requests, required for `apps/web`
  to call the API.
- 10 fake-container Messaging HTTP tests
  (`apps/server/src/routes/messaging/conversations.routes.test.ts`)
  and 9 fake-container Messaging WebSocket tests
  (`apps/server/src/websocket/messaging/connection.test.ts`), the
  latter using a new real-listening-TCP-server test harness
  (`test-utils/ws-test-server.ts`) since `app.request()` can't
  exercise a WS upgrade.
- 13 real-PostgreSQL Messaging repository tests, 5 real-PostgreSQL
  Messaging HTTP tests, and 2 real-PostgreSQL Messaging WebSocket
  tests, including a concurrent-`findOrCreateForUsers` test proving
  every concurrent caller resolves to the same conversation.
- ADR-0027 (interim friendship-gated messaging deviation), ADR-0028
  (WebSocket transport/presence/delivery architecture), ADR-0029
  (end-to-end encryption deferred).
- `docs/database/Messaging-Schema.md`, `docs/security/Messaging.md`,
  `docs/phases/Phase-1.0.md`; `docs/api/README.md` populated from an
  empty placeholder.
- `POST /auth/ws-ticket`: issues a short-lived (30s), single-use ticket
  for the `/messaging/ws` handshake, guarded by the existing,
  unmodified `requireAuth` middleware. `ws_tickets` Drizzle table +
  migration (`0003_dashing_network.sql`); domain entity,
  infrastructure (generate/hash), repository (atomic single-use
  `consume`), and service layers under `identity/`, following
  Identity's existing conventions.
- ADR-0030 (short-lived, single-use WS ticket authentication, replacing
  the query-string access token; documents the rejected refresh-cookie
  alternative).
- New fake-container WS tests (expired ticket, consumed-ticket reuse,
  concurrent-use-exactly-one-winner, rejection of the old
  `?access_token=` scheme) and a new
  `ws-ticket.repository.integration.test.ts` (real Postgres:
  valid-consume, expired, unknown-hash, double-consume, concurrent).
- Minimal PINChat frontend (`apps/web/src/`): Zustand `useAuthStore`
  (localStorage-persisted, with an explicit hydration flag), typed API
  client, auto-reconnecting WebSocket hook, `/login`/`/register` pages,
  conversation sidebar (friend list → start conversation), active
  conversation view (message history, composer, sending state,
  presence indicator). One additional hand-added shadcn/ui primitive
  (`Input`), same convention as the existing `Button`.
- **Post-1.0 production-hardening pass (2026-08-13):** Messaging rate
  limiting (`POST /messaging/conversations` 20/hour/IP, `POST
/auth/ws-ticket` 30/minute/IP, `send_message` WS event 20/10s/user),
  reusing the existing in-memory limiter; `middleware/validate-ws-
origin.ts` (rejects a `/messaging/ws` handshake whose `Origin` header
  doesn't match `WEB_ORIGIN`); `infrastructure/messaging/heartbeat.ts`
  (`sweepConnections`, ping/pong liveness sweep every 30s, terminates
  connections that missed the previous ping); graceful shutdown
  (`SIGTERM`/`SIGINT` close every open WS with code 1001 and drain the
  HTTP server); `WebSocketServer({ maxPayload: 64 * 1024 })`; new env
  var `COOKIE_SAME_SITE` (default `"Lax"`, `"None"` gated to
  production); `middleware/only-for-method.ts` (extracted, shared
  between `routes/social` and `routes/messaging`); ADR-0031
  (deployment architecture); `docs/deployment/README.md` rewritten
  from an empty stub. New tests: `app.test.ts` (CORS), `env.test.ts`
  (production fail-fast), `client-ip.test.ts`,
  `heartbeat.test.ts`, plus WS-origin/oversized-frame/rate-limit
  coverage in `connection.test.ts` and a rate-limit test in
  `conversations.routes.test.ts` and `auth.routes.test.ts`.

### Changed

- `CLAUDE.md` updated for Milestone 0.2 (current milestone, completed/
  active tasks, architecture goals, documentation index).
- `ROADMAP.md` restructured around explicit milestones (0.1–1.0) with
  status and completion criteria.
- `docs/backend`, `docs/frontend`, `docs/api`, `docs/database`,
  `docs/deployment` index stubs updated to reference the now-decided
  stack instead of saying it was still pending.
- `CLAUDE.md` updated for Milestone 0.3; flagged that `docs/product/`
  drafts are assistant-authored, not the founder's real specification,
  pending replacement.
- `ROADMAP.md` updated: Milestone 0.2 marked blocked on real product
  docs; Milestone 0.3 (renamed from "Tooling & CI" to "Engineering
  Environment") tracked with unverified-install caveat.
- `CONTRIBUTING.md` gained a Quality Gates section.
- `DECISIONS.md` updated with ADR-0015 through ADR-0019.
- `docs/engineering/coding-standards.md` expanded: folder/file naming,
  barrel export policy, import ordering, error handling, logging,
  comments, and testing conventions mapped to the new architecture
  layers.
- All six `packages/*/README.md` linked to their
  `Package-Architecture.md` entry.
- `CLAUDE.md`, `ROADMAP.md`, and the Engineering Journal updated for
  Milestone 0.4.
- `CLAUDE.md`, `ROADMAP.md`, `DECISIONS.md`, and the Engineering
  Journal updated for Milestone 0.5; Milestone 0.3 marked Complete now
  that `pnpm install`/lint/build have actually been verified.
- `CLAUDE.md`, `ROADMAP.md`, `DECISIONS.md`, `TODO.md`, and the
  Engineering Journal updated for Milestone 0.6.
- `apps/server/package.json` gained `drizzle-orm` as an explicit
  dependency (was only reachable transitively through
  `packages/database`).
- `tsBuildInfoFile` set to live inside `dist/` for every package/app
  with an `outDir` (previously defaulted to living next to
  `tsconfig.json`).
- ADR-0025 resolved (status changed from "Accepted, with an open
  unresolved conflict" to "Accepted"): internal code keeps
  "credential", user-facing UI will say "PIN", DB fields and digit
  range (4–8) unchanged. `Authentication.md`, `Session-Management.md`,
  the PRD, `CLAUDE.md`, `ROADMAP.md` (Milestone 0.6 marked Complete),
  `DECISIONS.md`, and the Engineering Journal updated for Milestone 0.7.
- `RefreshTokenRepository.revoke(id)` return type changed from `void`
  to `RefreshToken | null` (atomic conditional update — see Fixed,
  below); `refresh-session.service.ts` and
  `fake-identity-container.ts` updated to match.
- `ROADMAP.md`: Milestone 0.5 and 0.7 marked Complete (their sole open
  item, live-database verification, closed under Milestone 0.8);
  Milestone 0.8 added; Progress Summary and Next Objective updated.
  `CLAUDE.md`, `TODO.md`, and the Engineering Journal updated for
  Milestone 0.8. `docs/security/Session-Management.md` and
  `docs/database/Identity-Schema.md` updated with verification notes.
- `apps/server/src/test-utils/real-db.ts`'s `resetIdentityTables`
  renamed `resetAllTables` (also truncates the two new Social tables);
  the two Milestone 0.8 integration test files updated to match,
  behavior otherwise unchanged.
- `apps/server/src/app.ts` refactored to build one shared `Database`
  instance from `DATABASE_URL` and pass it to both
  `createIdentityContainer` and `createSocialContainer`, instead of
  each container opening its own connection pool; also now mounts
  `/social/*` routes.
- `ROADMAP.md`: Milestone 0.9 added, Progress Summary and Next
  Objective updated. `CLAUDE.md`, `TODO.md`, `DECISIONS.md` (ADR-0026
  indexed), and the Engineering Journal updated for Milestone 0.9.
  `docs/database/README.md` and `docs/security/README.md` link the
  new Social docs.
- `docs/product/Product-Requirements-Document.md`: BlueMoon Token
  status updated from "documented, not implemented" to implemented;
  Open Question #4 resolved (both participants must be existing
  BlueMoon accounts) — status/roadmap notes only, requirements
  unchanged.
- `@hono/node-server` bumped `^1.13.7` → `^2.1.0` for its native
  `upgradeWebSocket` export (the installed 1.x range has no WebSocket
  support at all); `ws` and `@types/ws` added.
- `apps/server/src/app.ts` mounts `/messaging/*` HTTP routes and the
  `/messaging/ws` WebSocket route, extends `CreateAppOptions` with
  `messagingContainer`; `apps/server/src/index.ts` constructs a
  `WebSocketServer({noServer:true})` and passes it to
  `serve({websocket})`.
- `apps/server/src/test-utils/real-db.ts`'s `resetAllTables` now also
  truncates `conversations`/`messages`.
- `apps/server/src/test-utils/fake-social-container.ts` additively
  exposes its internal `FriendshipRepository` so the Messaging fake
  container can share the same friendship data in cross-context HTTP
  tests.
- `ROADMAP.md`: Milestone 1.0 added as the interim, friendship-gated
  messaging vertical slice (Complete); the canonical PINChat MVP
  renumbered to Milestone 1.1 (unchanged scope, still Blocked).
  Progress Summary and Next Objective updated. `CLAUDE.md`, `TODO.md`,
  `DECISIONS.md` (ADR-0027–0029 indexed), and the Engineering Journal
  updated for Milestone 1.0. `docs/database/README.md` and
  `docs/security/README.md` link the new Messaging docs.
- `docs/product/Product-Requirements-Document.md`: status note
  disclosing Milestone 1.0's two deliberate deviations (friendship-
  gated messaging instead of session/PIN; no end-to-end encryption) —
  status note only, canonical requirements unchanged.
- `middleware/identity/require-ws-auth.ts`'s signature changed from
  `(accessTokens: AccessTokenService)` to `(wsTickets:
WsTicketRepository)`; `apps/server/src/app.ts`'s `/messaging/ws`
  route wiring updated to match. `apps/web`'s `lib/api-client.ts`
  (`wsUrl` now takes a ticket, new `requestWsTicket`) and
  `hooks/use-messaging-socket.ts` (fetches a fresh ticket before every
  connect/reconnect attempt) updated to match.
- ADR-0028 amended in place: its WebSocket authentication
  sub-decision (`?access_token=` in the query string) is superseded by
  ADR-0030; every other decision in that ADR (library choice, per-user
  connections, persist-then-broadcast, in-memory presence/broadcast)
  is unchanged. `docs/security/Messaging.md`'s "WebSocket
  Authentication" section, `docs/api/README.md`'s WS endpoint
  reference, `docs/phases/Phase-1.0.md`, `DECISIONS.md` (ADR-0030
  indexed), and the Engineering Journal updated for this hardening
  pass.
- `app.ts`'s CORS middleware now sets `credentials: true`; `apps/web`'s
  `lib/api-client.ts` sends `credentials: "include"` on every request
  — without both, `Set-Cookie` on a cross-origin response is silently
  ignored by the browser regardless of `SameSite`, which had been true
  even in local dev (`localhost:3000` → `localhost:8787`) without
  anyone noticing since only the (cookie-independent) access token had
  been exercised through a browser before.
- `apps/web` now calls `POST /auth/refresh`: `lib/api-client.ts`'s
  `request()` wrapper retries a 401 exactly once via a coalesced
  silent refresh (concurrent 401s share one in-flight call); on
  refresh failure the original 401 is surfaced and auth state is
  cleared. `store/auth-store.ts` gained a `setAccessToken` action.
  Previously `apps/web` never called this already-existing,
  already-tested endpoint — a 15-minute access-token TTL had no
  recovery path short of logging in again.
- `env.ts`'s `serverEnvSchema` gained a `superRefine`: production
  requires `DATABASE_URL` and a non-default `WEB_ORIGIN`, and
  `COOKIE_SAME_SITE=None` requires `NODE_ENV=production` — fails fast
  at startup instead of starting in a silently-broken or
  silently-degraded state.

### Fixed

- **WebSocket authentication exposed a long-lived access token in the
  `/messaging/ws` URL** (`?access_token=<token>`) — URLs are logged
  and retained by proxies, browser history, and access logs far more
  readily than headers or bodies, exposing the credential well beyond
  its intended lifetime and audience. Replaced with a short-lived,
  single-use, database-backed ticket obtained over the existing
  authenticated HTTP path; the old query-string scheme no longer
  authenticates anything. See ADR-0030.

- Stale "stack choice pending" notes in `docs/backend`, `docs/frontend`,
  `docs/api`, `docs/database`, `docs/deployment` READMEs, contradicting
  the ADRs that had already decided the stack.
- ESLint 9 flat-config migration across the whole workspace (tooling
  shipped legacy `.eslintrc` format; `eslint` was never an actual
  installed dependency anywhere).
- Shared packages (`types`, `utils`, `config`, `database`, `auth`)
  compiled to `dist/` with `package.json` `main`/`types` pointing
  there, so `node` can resolve them in a real production start (they
  previously pointed straight at raw `.ts` source).
- `"type": "module"` added consistently across packages, fixing
  ESM/CJS named-export interop under tsx/Node; every package's
  `eslint.config.js` renamed to `.cjs` since that change broke
  ESLint's config-file resolution.
- `eslint-config-next`'s parser doesn't satisfy typescript-eslint's
  parser-services check (crashed `consistent-type-imports`) and
  doesn't track type-only-import usage correctly (false "unused"
  errors) — reordered the Next config so the shared base wins; disabled
  Next's redundant build-time ESLint pass in favor of the dedicated
  `pnpm lint` gate.
- `packages/ui` given a minimal empty placeholder so the workspace-wide
  `type-check`/`build` gates pass (it remains out of scope otherwise).
- Root-caused and fixed a reproducible `tsc` build race: composite TS
  projects write their incremental cache next to `tsconfig.json` by
  default, not inside `outDir`, so `rm -rf dist` (used ad hoc in
  Milestones 0.5/0.6) never invalidated it and `tsc` sometimes silently
  skipped re-emitting files it wrongly believed were still current.
- Refresh-token rotation race (Milestone 0.8, found via real-Postgres
  testing): two concurrent requests presenting the same still-active
  refresh token could both pass the active check and both rotate it,
  producing two valid children of one parent token.
  `RefreshTokenRepository.revoke(id)` is now an atomic conditional
  `UPDATE ... WHERE revoked_at IS NULL ... RETURNING`; the loser of
  the race gets `null` back and `refresh-session.service.ts` now
  treats that identically to detected reuse (kills the session).
- Root `pnpm test:db` silently skipped every test: Turbo strips
  environment variables from a task's shell unless declared in that
  task's `env` list, so `TEST_DATABASE_URL`/`DATABASE_URL` never
  reached `vitest`. `turbo.json`'s `test:db` task now declares both.
  Found by running `pnpm test:db` against a fresh disposable database
  as part of closing Milestone 0.8, not by `pnpm --filter @bluemoon/server
test:db`, which bypasses Turbo and had masked the gap.
- `routes/social/index.ts`: Hono's `app.use(path, middleware)` matches
  every HTTP method on that path, so the initial wiring would have
  applied the `POST /social/friendships` (consume) rate limiter to
  `GET /social/friendships` (list) requests too, sharing one quota
  across an authenticated read and a guessing-relevant write. Fixed
  with a small `onlyForMethod` middleware wrapper scoping the limiter
  to `POST` only.
- `apps/web`'s `useAuthStore` (zustand `persist`) rehydrates from
  `localStorage` asynchronously; the chat layout's auth guard checked
  `accessToken` on mount and redirected to `/login` before hydration
  completed, briefly bouncing an already-logged-in user to the login
  page on every fresh page load. Fixed with an explicit `hasHydrated`
  flag (set via `persist`'s `onRehydrateStorage`) gating the redirect
  decision. Found and fixed during Milestone 1.0's live browser
  verification.
- `infrastructure/identity/client-ip.ts`'s `getClientIp` trusted the
  _first_ `x-forwarded-for` entry, which is client-supplied and
  spoofable — any caller could defeat every per-IP rate limiter in
  this codebase by sending a different value per request. Now trusts
  the _last_ entry (the one the trusted reverse proxy, Railway's edge,
  actually appended). Assumes exactly one trusted proxy hop; see
  ADR-0031.
