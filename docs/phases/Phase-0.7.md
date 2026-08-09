# Phase 0.7 — Identity HTTP/API Layer

**Status: Complete** | **Dates:** 2026-07-27 (live-database verification closed under [Phase-0.8.md](./Phase-0.8.md), 2026-08-09)

## Purpose

Expose the Identity domain (Milestone 0.6's domain/application/
infrastructure/repository layers, treated as stable) through a
production-ready HTTP API, with real request validation, error
mapping, cookie-based session handling, OpenAPI documentation, and a
committed automated test suite.

## Goals

- Hono route modules + controllers for all 9 planned endpoints.
- Application services wired via dependency injection (composition
  root), not modified.
- Existing Zod validation schemas reused for request validation.
- Centralized error mapping (already existed; verify it covers the new
  routes).
- Secure cookie-based refresh-token session handling.
- OpenAPI documentation generated and served live.
- Real API integration tests (select a test runner — open since
  Milestone 0.3).
- Middleware: request ID, logging (already existed, combined),
  authentication, error handling (already existed), rate limiting.
- Resolve the credential/PIN naming conflict left open by Milestone 0.6.

## Tasks

- [x] Composition root (`container.ts`)
- [x] Auth middleware (`require-auth.ts`), rate-limit middleware
      (`rate-limit.ts`)
- [x] Routes (`routes/identity/auth.routes.ts`) + controllers
      (`controllers/identity/auth.controller.ts`) for all 9 endpoints
- [x] Cookie-based refresh transport (`infrastructure/identity/cookies.ts`)
- [x] OpenAPI docs (automatic via `@hono/zod-openapi`, verified live)
- [x] Vitest selected; 16 integration tests, all passing
- [x] ADR-0025 resolved
- [x] Docs updated (Authentication.md, Session-Management.md, PRD,
      CLAUDE.md, ROADMAP.md, Engineering Journal, CHANGELOG.md, this
      document)
- [x] Live PostgreSQL verification — closed under [Phase-0.8.md](./Phase-0.8.md)
- [ ] Domain-layer unit tests — still open; real-DB repository tests
      closed under [Phase-0.8.md](./Phase-0.8.md)

## Completed Work

**Composition root** (`apps/server/src/container.ts`): wires every
Milestone 0.6 repository/infrastructure/service factory into an
`IdentityContainer`, unmodified — routes/controllers never construct
their own dependencies.

**Middleware** (`apps/server/src/middleware/identity/`):
`require-auth.ts` verifies `Authorization: Bearer <token>` and sets
`c.get("auth")`; `rate-limit.ts` wraps the existing in-memory
`RateLimiter` as Hono middleware, namespaced per route.

**Routes + controllers**: `routes/identity/auth.routes.ts` defines
`createRoute` objects (request/response Zod schemas, reusing the
existing `validation/identity/*.schema.ts` for bodies) and
`routes/identity/index.ts` wires middleware + controllers onto the
app. `controllers/identity/auth.controller.ts` has one
`RouteHandler<typeof someRoute>` per endpoint, translating HTTP
(cookies, headers, status codes) to the untouched use cases. All 9
endpoints: `POST /auth/{register,login,logout,refresh,
change-credential,trust-device}`, `DELETE /auth/trust-device/:id`,
`GET /auth/{me,devices}`.

**Cookie transport** (`infrastructure/identity/cookies.ts`): refresh
token as an `httpOnly`, `Secure`-outside-development, `SameSite=Lax`
cookie scoped to `/auth`; access token in the JSON response body.

**Two additive-only exceptions** to "repositories/services are
stable": `DeviceRepository.findAllByUserId` (no existing method could
list a user's devices, needed for `GET /auth/devices`) and
`TooManyRequestsError`/`TOO_MANY_REQUESTS` added to `packages/utils`/
`packages/types` (shared infrastructure, not Identity domain/repo/
service code, and needed for rate-limited endpoints to return a
correct 429).

**Authorization gap closed without modifying the repository**:
`TrustedDeviceRepository.revoke(id)` has no built-in ownership check.
Since `DELETE /auth/trust-device/:id` only carries a trust-grant ID in
its path, `deviceId` is required as a query parameter so the
controller can confirm — via the existing `findActiveByUserAndDevice`
— that the trust grant actually belongs to the caller before revoking
it.

**Test runner selected**: Vitest (open item since Milestone 0.3).
`apps/server/src/test-utils/fake-identity-container.ts` extracts the
in-memory fake repositories (used ad hoc for manual verification in
Milestones 0.6/0.7) into a reusable module implementing the exact same
interfaces as the real Drizzle-backed ones.
`routes/identity/auth.routes.test.ts` has 16 tests covering every
endpoint plus edge cases.

**ADR-0025 resolved**: internal code keeps "credential"; user-facing
UI will say "PIN" once a UI exists; database fields unchanged; digit
range stays 4–8 (the conflicting "4–6" spec was not adopted).

## Files Created

`apps/server/src/container.ts`,
`apps/server/src/infrastructure/identity/{cookies,client-ip}.ts`,
`apps/server/src/middleware/identity/{require-auth,rate-limit}.ts`,
`apps/server/src/routes/identity/{auth.routes,index}.ts`,
`apps/server/src/controllers/identity/auth.controller.ts`,
`apps/server/src/test-utils/fake-identity-container.ts`,
`apps/server/src/routes/identity/auth.routes.test.ts`,
`apps/server/vitest.config.ts`.

## Files Modified

`apps/server/src/app.ts` (mounts Identity routes when `DATABASE_URL`
is set), `apps/server/src/env.ts` (`JWT_ACCESS_TOKEN_SECRET`),
`apps/server/.env.example`,
`apps/server/src/repositories/identity/device.repository.ts`
(additive `findAllByUserId`), `packages/utils/src/errors.ts`
(additive `TooManyRequestsError`), `packages/types/src/error.ts`
(additive `TOO_MANY_REQUESTS`), `apps/server/package.json` (vitest,
test script), `docs/adr/ADR-0025-credential-authentication.md`
(resolution), `docs/security/{Authentication,Session-Management}.md`,
`docs/product/Product-Requirements-Document.md`, `CLAUDE.md`,
`ROADMAP.md`, `DECISIONS.md`, `TODO.md`, `CHANGELOG.md`,
`docs/engineering/Engineering-Journal.md`.

## Architecture Decisions

ADR-0025 resolved (status changed, not superseded — same ADR number,
per DECISIONS.md's "never delete a row" convention applied to
resolutions as well as supersessions).

## Problems Found

1. Real type bug: `deviceLabel` could be `undefined` from the Zod
   schema (`.optional()`) but the Milestone 0.6 services require
   `string | null` — caught by `tsc`, not a runtime surprise.
2. Two genuine gaps in what Milestone 0.6 left "stable": no way to
   list a user's devices, no ownership check on trust-grant revocation.
3. Test coverage remains HTTP-integration-level only — no domain-layer
   unit tests, no live-database repository tests.
4. Still no live PostgreSQL instance available in this environment.

## Problems Solved

1. Fixed with an explicit `?? null` normalization at both call sites
   (register's own registration + its auto-login call).
2. Resolved with a minimal additive repository method
   (`findAllByUserId`) and a controller-side ownership check
   (`deviceId` query param + `findActiveByUserAndDevice`), both
   flagged explicitly rather than silently worked around or skipped.
   3–4. Not solved this phase — tracked in TODO.md/CLAUDE.md Active Tasks.

## Quality Gate Results

`tsc --noEmit` and `eslint` clean after every layer added. 16/16
Vitest tests passing
(`apps/server/src/routes/identity/auth.routes.test.ts`), covering:
registration (success, duplicate username, invalid-shape rejection),
login (success, generic failure message for both wrong-credential and
unknown-username, account lockout after 5 failures, rate limiting
after 10/15min), protected routes (401 without a token, `/auth/devices`
listing, the `DELETE trust-device` ownership check, `change-credential`
invalidating the old credential), refresh (rotation, reuse detection
killing the entire session including the rotated-forward token, 401
with no cookie), logout (cookie cleared), and OpenAPI doc completeness.
Full workspace `pnpm install`/`lint`/`type-check`/`test`/`build` run
at the end of this phase — see the closing commit for the exact
output.

## Lessons Learned

Splitting "routes" and "controllers" into separate files while keeping
full type safety required typing each controller handler against its
specific route definition (`RouteHandler<typeof someRoute>`) rather
than a generic `Context` — worth remembering as the pattern for any
future route module in this codebase. Treating repositories/services
as "stable" during a milestone is a useful scope boundary, but real
HTTP-layer requirements sometimes reveal genuine gaps (list endpoints,
ownership checks) that a purely additive change is the right way to
close, rather than either violating the boundary silently or building
an awkward workaround at the wrong layer.

## Next Phase

Live PostgreSQL verification, deeper test coverage (domain unit tests,
real-DB repository tests), then Milestone 1.0 (PINChat MVP) once
Milestones 0.2 through 0.7 are all actually closed out.
