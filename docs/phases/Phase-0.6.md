# Phase 0.6 — Identity & Authentication Foundation

**Status: Complete** | **Dates:** 2026-07-25 – 2026-07-27

Note: the HTTP/API layer, test suite, and live-database verification
originally listed as this phase's open items were delivered/tracked
under [Phase-0.7](./Phase-0.7.md) instead, once that phase was
explicitly scoped separately. This phase closes on its actual scope:
domain/repository/application layers, complete and verified.

## Purpose

Implement the complete Identity domain and authentication
infrastructure — the first bounded context every future BlueMoon
application will use. Explicitly not chat, friends, communities, or
messaging.

## Goals

- Domain-driven design: `User`, `Username`, `Credential`, `Session`,
  `Device`, `TrustedDevice`, `RefreshToken`, `LoginAttempt`, separated
  into domain/application/infrastructure/API layers.
- Real Drizzle schema for `users`, `devices`, `sessions`,
  `login_attempts`, `refresh_tokens` (plus `trusted_devices` and
  `audit_events`, needed to actually support "device trust" and
  "audit" requirements).
- Username and credential validation rules, documented and implemented.
- Register/login/logout/refresh/revoke/remember-device/device-trust,
  as application-layer use cases (HTTP layer explicitly deferred).
- Session strategy: cookie/token approach, lifetime, rotation,
  revocation, idle timeout, max lifetime.
- Rate limiting (implemented, not yet wired to any endpoint).
- Audit events for every security-relevant action.
- Documentation: `Authentication.md`, `Session-Management.md`,
  `Identity-Schema.md`, plus ADRs for the identity model, session
  strategy, and credential authentication.

## Tasks

- [x] Drizzle schema (7 tables)
- [x] Domain layer (value objects, entities, rules, errors)
- [x] Infrastructure (hashing, JWT, rate limiter, audit writer)
- [x] Repositories (one per entity)
- [x] Application layer (7 use cases, validation, DTOs)
- [x] Root-caused and fixed a reproducible `tsc` build race
- [x] `docs/security/Authentication.md`, `Session-Management.md`,
      `docs/database/Identity-Schema.md`
- [x] ADR-0023, ADR-0024, ADR-0025
- [ ] **Resolve the credential/PIN naming and digit-range conflict**
- [ ] HTTP/API layer (routes, controllers, auth middleware, OpenAPI)
- [ ] Automated test suite (test runner not yet selected)
- [ ] Live PostgreSQL verification

## Completed Work

**Schema** (`packages/database/src/schema/`): `users` (username unique,
`credential_hash`, lockout fields), `devices` (per-user fingerprints),
`trusted_devices` (separate trust-grant records, not a flag), `sessions`
(max-lifetime expiry), `refresh_tokens` (hashed, rotation chain via
`rotated_from_id`), `login_attempts` (per-attempt audit), `audit_events`
(generic event log). Migration generated via `drizzle-kit generate` and
inspected directly (7 tables, all indexes/FKs correct).

**Domain** (`apps/server/src/domain/identity/`): `Username` value
object (3–20 chars, lowercase `a-z0-9_`, reserved-name list, ASCII-only
by design); `Credential` value object (4–8 digits, trivial-value
rejection, `reveal()` as the only way to extract the raw value —
`toString()` deliberately does not); entities as plain interfaces with
small pure predicates (`isLocked`, `isTrustActive`, `isSessionActive`,
`isRefreshTokenActive`); session-lifetime and lockout-policy rules;
typed domain errors extending `packages/utils`' `AppError` hierarchy.

**Infrastructure** (`apps/server/src/infrastructure/identity/`):
Argon2id hashing (real `argon2` package, prebuilt native binding, no
compiler needed); JWT access tokens via `jose` (HS256,
15-minute TTL); opaque rotating refresh tokens (32-byte random value,
SHA-256 hash for storage — a deliberately different, faster hash than
the credential's, since it's a lookup key not a low-entropy secret);
in-memory fixed-window rate limiter (documented limitation:
single-process, not distributed); audit event writer.

**Repositories** (`apps/server/src/repositories/identity/`): one per
entity, narrow interfaces (no generic CRUD), Drizzle-backed.

**Application layer** (`apps/server/src/services/identity/`): register,
login (one coherent orchestration — lockout check, credential verify,
failure/lockout recording, device/trust lookup, session+token
issuance, all order-dependent), logout, refresh-session (rotation +
reuse detection — a revoked token presented again kills the _entire_
session, not just the one request), revoke-session, trust-device/
revoke-device-trust, change-credential (revokes every session on
rotation). Zod validation schemas (shape-only, first-pass filter —
authoritative rules stay in the value objects). Output DTOs stripping
`credentialHash`/`failedLoginCount`/`lockedUntil`.

**Documentation**: `docs/security/Authentication.md` (username/credential
rules, login flow, lockout, rate limiting, audit),
`docs/security/Session-Management.md` (token strategy, rotation, reuse
detection, revocation, device trust), `docs/database/Identity-Schema.md`
(ERD + full table reference). ADR-0023 (identity domain model —
separate bounded context from PINChat's session-code), ADR-0024
(session strategy), ADR-0025 (credential authentication — flags the
open naming conflict).

## Files Created

`packages/database/src/schema/{users,devices,trusted-devices,sessions,
refresh-tokens,login-attempts,audit-events,index}.ts`,
`packages/database/migrations/0000_lame_deadpool.sql`,
`apps/server/src/domain/identity/**`,
`apps/server/src/infrastructure/identity/**`,
`apps/server/src/repositories/identity/**`,
`apps/server/src/services/identity/**`,
`apps/server/src/validation/identity/**`,
`apps/server/src/events/identity-events.ts`,
`docs/security/{Authentication,Session-Management}.md`,
`docs/database/Identity-Schema.md`,
`docs/adr/ADR-0023-identity-domain-model.md`,
`docs/adr/ADR-0024-session-strategy.md`,
`docs/adr/ADR-0025-credential-authentication.md`.

## Files Modified

`packages/database/src/{client,index}.ts`, `drizzle.config.ts` (schema
path), `packages/database/src/seed.ts`, `packages/utils/src/id.ts`
(`generateUuid()`), every package/app `tsconfig.json` with an `outDir`
(`tsBuildInfoFile` fix), `apps/server/package.json` (`argon2`, `jose`,
`drizzle-orm` dependencies), `docs/database/README.md`,
`docs/security/README.md`, `CLAUDE.md`, `ROADMAP.md`, `DECISIONS.md`,
`TODO.md`, `CHANGELOG.md`, `docs/engineering/Engineering-Journal.md`.

## Architecture Decisions

ADR-0023 (identity domain model), ADR-0024 (session strategy),
ADR-0025 (credential authentication).

## Problems Found

1. **Reproducible `tsc` build race** (root-caused, see Problems
   Solved) — had been worked around ad hoc across two prior milestones
   without being understood.
2. **Phantom dependency**: `apps/server` imported `drizzle-orm`
   directly in the new repositories but never declared it — only
   reachable transitively through `packages/database`, which pnpm's
   strict isolation (ADR-0016) doesn't guarantee stays resolvable.
3. **Open naming conflict, not yet resolved**: an earlier instruction
   said never call platform authentication "PIN" (use
   credential/authSecret) to avoid clashing with PINChat's unrelated
   session join-code. A later instruction specified "4–6 digit PIN" —
   reintroducing exactly that word and a different digit range than
   what's implemented and tested (credential, 4–8 digits). Flagged in
   ADR-0025 rather than silently resolved either way.
4. No HTTP/API layer exists yet for Identity, no committed automated
   test suite, and no live PostgreSQL verification — all explicitly
   out of this phase's scope so far, tracked as open work.

## Problems Solved

**The `tsc` build race**: composite TypeScript projects default to
writing their incremental `.tsbuildinfo` cache next to `tsconfig.json`,
not inside `outDir`. Every prior `rm -rf dist && tsc` workaround deleted
outputs but left that cache intact, so `tsc` believed its cached
outputs were still valid and silently skipped re-emitting some of them
— no error, just missing files. Fixed by setting
`tsBuildInfoFile: "dist/.tsbuildinfo"` in every package/app tsconfig
with an `outDir`, so the cache always lives and dies with its own
outputs. Verified directly: deleted `dist/`, built (27 files), deleted
`dist/` again, built again — 27 files both times (previously this
sequence sometimes produced a partial `dist/`).

**The phantom dependency**: added `drizzle-orm` as an explicit
`apps/server` dependency.

## Quality Gate Results

`tsc --noEmit` and `eslint` verified clean after every layer
(domain, infrastructure, repositories, application). No live-database
integration test was possible (none available in this environment) —
instead, every application-layer use case was compiled and run against
in-memory fake repositories implementing the same interfaces, covering:
registration, duplicate-username rejection, wrong-credential lockout
counter increment, successful login resetting it, device trust
reflected on next login, refresh rotation, reuse-of-a-rotated-token
correctly killing the entire session (confirmed the forward-rotated
token also stops working, not just the reused one), logout, and
credential change invalidating old sessions while the new credential
works immediately. `pnpm test` was not run as a workspace-wide gate
this phase — no test runner is configured yet, so it would currently
succeed trivially (no-op) rather than actually verify anything.

## Lessons Learned

A build tool "working" (no error printed) is not the same as it doing
what you think — the `tsc` race produced silently-incomplete output
for two milestones before being properly root-caused instead of
worked around. Manual verification against real libraries and in-memory
fakes caught real logic bugs (and confirmed subtle correct behavior,
like the reuse-detection killing forward-rotated tokens too) that
type-checking alone would never have caught — this is not a substitute
for a committed test suite, but it materially reduced risk while one
doesn't exist yet.

## Next Phase

Complete Milestone 0.6: resolve the naming conflict, build the HTTP/API
layer, select a test runner and write real tests, verify against a live
PostgreSQL instance. Then Milestone 1.0 (PINChat MVP).
