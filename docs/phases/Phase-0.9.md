# Phase 0.9 — Social / Friendship + BlueMoon Token

**Status: Complete** | **Dates:** 2026-08-09

## Purpose

Implement the Social bounded context on top of the now-verified
Identity stack (Milestone 0.8): the BlueMoon Token as the sole
mechanism for establishing a friendship between two BlueMoon accounts,
per [Product-Requirements-Document.md](../product/Product-Requirements-Document.md#bluemoon-token).
A username alone must never be sufficient to create a friendship.

## Goals

- Drizzle schema for `blue_moon_tokens` and `friendships`, reusing the
  existing `users` table -- no duplicate identity concept.
- Domain/application/infrastructure/repository/HTTP layers matching
  Identity's established conventions exactly.
- BlueMoon Token: cryptographically random generation, hashed at rest,
  300-second expiry, single-use, atomic under concurrent consumption.
- Friendship: created only by token consumption, undirected,
  duplicate-proof, removable by either participant.
- Real-database proof that concurrent consumption of one token
  resolves to exactly one success -- the same class of guarantee
  Milestone 0.8 established for refresh-token rotation.
- `pnpm test` stays database-free; new real-Postgres coverage is
  opt-in via `pnpm test:db`, exactly as Milestone 0.8 established.

## Tasks

- [x] `blue_moon_tokens`, `friendships` Drizzle schema + migration
- [x] Domain: entities, errors, token-lifetime rule
      (`domain/social/`)
- [x] Infrastructure: token generation/hashing (deliberately separate
      module from Identity's auth infrastructure), audit writer
      (`infrastructure/social/`)
- [x] Repositories: `BlueMoonTokenRepository`, `FriendshipRepository`
      (including the atomic transactional consume operation)
      (`repositories/social/`)
- [x] Application services: generate, consume (+ create friendship),
      list, remove (`services/social/`)
- [x] `social-container.ts` composition root, `app.ts` refactored to
      share one `Database` instance across Identity and Social
- [x] HTTP: 4 endpoints, OpenAPI-documented, auth + rate limiting
      (`routes/social/`, `controllers/social/`)
- [x] Fake-container HTTP tests (18) -- `pnpm test` stays
      database-free
- [x] Real-Postgres repository tests (14) + HTTP tests (4), including
      the concurrent-consumption race proof
- [x] ADR-0026 (BlueMoon Token security model)
- [x] Docs: this document, `docs/database/Social-Schema.md`,
      `docs/security/Social.md`, `CLAUDE.md`, `ROADMAP.md`, `TODO.md`,
      `CHANGELOG.md`, Engineering Journal, PRD status update

## Completed Work

**Schema** (`packages/database/src/schema/{blue-moon-tokens,friendships}.ts`):
`blue_moon_tokens` (owner, hash, expiry, consumed-at/-by) and
`friendships` (undirected pair, canonical storage order enforced by a
check constraint that also rules out self-friendship). Migration
`0001_amusing_the_executioner.sql` applied cleanly to a fresh
PostgreSQL instance; every table, FK, unique constraint, check
constraint, and index confirmed present via `psql`.

**Domain** (`apps/server/src/domain/social/`): `BlueMoonToken` and
`Friendship` entities with pure helper functions
(`isBlueMoonTokenActive`, `canonicalizePair`, `otherParticipant`);
`BLUE_MOON_TOKEN_TTL_MS = 300_000`; typed errors, all deliberately
generic where anti-enumeration matters
(`BlueMoonTokenInvalidError` covers every invalid-consumption case).

**Infrastructure** (`apps/server/src/infrastructure/social/`):
`generateBlueMoonToken`/`hashBlueMoonToken` -- same pattern as
`infrastructure/identity/refresh-token.ts` (32 random bytes, SHA-256)
but a separate module, per the product requirement that a BlueMoon
Token must not be authentication infrastructure. Separate
`SocialAuditWriter` writing to the same `audit_events` table Identity
uses.

**Repositories** (`apps/server/src/repositories/social/`):
`BlueMoonTokenRepository` (creation only) and `FriendshipRepository`
(CRUD plus the one cross-table atomic operation,
`consumeTokenAndCreateFriendship` -- a single conditional `UPDATE ...
WHERE consumed_at IS NULL AND expires_at > now() ... RETURNING`
followed by an `ON CONFLICT DO NOTHING` friendship insert, both inside
one `db.transaction()`). See [ADR-0026](../adr/ADR-0026-blue-moon-token.md)
for why this lives here rather than split across two repositories or
wrapped at the service layer.

**Application services** (`apps/server/src/services/social/`):
`generateBlueMoonTokenForOwner` (owner always from the session, never
a request field), `consumeBlueMoonToken` (resolves username →
user, rejects self-consumption before touching the database, generic
error on any failure), `listFriendships`, `removeFriendship`
(ownership-checked, either participant may remove).

**Composition root and app wiring**: `apps/server/src/social-container.ts`
mirrors `container.ts`'s shape as a separate bounded-context container
(reuses Identity's `UserRepository` -- no duplicate user concept).
`app.ts` now builds one shared `Database` instance from `DATABASE_URL`
and passes it to both `createIdentityContainer` and
`createSocialContainer`, instead of each opening its own connection
pool.

**HTTP** (`routes/social/`, `controllers/social/`): `POST
/social/blue-moon-tokens` (generate), `POST /social/friendships`
(consume + create), `GET /social/friendships` (list), `DELETE
/social/friendships/{id}` (remove) -- all behind Identity's unmodified
`requireAuth` middleware (reused, not duplicated). One real bug found
and fixed while wiring routes: Hono's `app.use(path, middleware)`
matches every HTTP method on that path, so naively rate-limiting
`/social/friendships` would have throttled `GET` (list) using the
`POST` (consume) quota; fixed with a small method-scoped middleware
wrapper (`onlyForMethod`) in `routes/social/index.ts`.

**Testing**: 18 fake-container HTTP tests
(`friendships.routes.test.ts`) covering generation, consumption
(valid/invalid/expired/reused/self/unknown-username), listing,
removal (including non-participant rejection), rate limiting, and
OpenAPI exposure -- `pnpm test` stays database-free at 34/34 total
(16 Identity + 18 Social). 14 real-Postgres repository tests +
4 real-Postgres HTTP tests
(`social-repositories.integration.test.ts`,
`friendships.routes.integration.test.ts`) -- `pnpm test:db` at 39/39
total (15 + 14 Identity/Social repository, 6 + 4 Identity/Social HTTP).
Both concurrent-consumption tests (repository-level and HTTP-level)
fire two simultaneous requests for the same token and assert exactly
one success.

## Files Created

`packages/database/src/schema/{blue-moon-tokens,friendships}.ts`,
`packages/database/migrations/0001_amusing_the_executioner.sql`,
`apps/server/src/domain/social/{entities/blue-moon-token,entities/friendship,errors,rules/token-lifetime}.ts`,
`apps/server/src/infrastructure/social/{blue-moon-token,audit-writer}.ts`,
`apps/server/src/repositories/social/{blue-moon-token,friendship}.repository.ts`,
`apps/server/src/services/social/{dto,generate-token,consume-token,list-friendships,remove-friendship}.service.ts`,
`apps/server/src/validation/social/consume-token.schema.ts`,
`apps/server/src/routes/social/{friendships.routes,index}.ts`,
`apps/server/src/controllers/social/friendships.controller.ts`,
`apps/server/src/events/social-events.ts`,
`apps/server/src/social-container.ts`,
`apps/server/src/test-utils/fake-social-container.ts`,
`apps/server/src/routes/social/friendships.routes.test.ts`,
`apps/server/src/repositories/social/social-repositories.integration.test.ts`,
`apps/server/src/routes/social/friendships.routes.integration.test.ts`,
`docs/adr/ADR-0026-blue-moon-token.md`,
`docs/database/Social-Schema.md`, `docs/security/Social.md`,
`docs/phases/Phase-0.9.md` (this document).

## Files Modified

`packages/database/src/schema/index.ts` (additive exports),
`apps/server/src/app.ts` (shared `Database` instance, mounts Social
routes), `apps/server/src/test-utils/real-db.ts` (`resetIdentityTables`
renamed `resetAllTables`, now also truncates the two new tables --
existing 0.8 integration tests updated to match, behavior unchanged
for them), `DECISIONS.md`, `CLAUDE.md`, `ROADMAP.md`, `TODO.md`,
`CHANGELOG.md`, `docs/engineering/Engineering-Journal.md`,
`docs/database/README.md`, `docs/security/README.md`,
`docs/product/Product-Requirements-Document.md` (BlueMoon Token status
updated from "documented, not implemented"; Open Question #4 resolved
-- status/roadmap notes only, requirements unchanged).

## Architecture Decisions

ADR-0026: BlueMoon Token atomic single-use consumption, kept separate
from authentication infrastructure.

## Problems Found

1. Real design question, not a bug: PRD Open Question #4 ("does the
   BlueMoon Token require both users to already have BlueMoon
   accounts?") was unresolved. Resolved by the only interpretation the
   current codebase supports -- no PINChat/session-only account
   concept exists yet -- and recorded in ADR-0026 and the PRD's Open
   Questions section rather than silently assumed.
2. Real bug: Hono's `app.use(path, middleware)` is method-agnostic, so
   the initial `/social/friendships` wiring would have applied the
   consume-endpoint rate limiter to `GET` (list) requests too.
3. Test-authoring bugs (not product bugs), same category as
   Milestone 0.8's username-length mistake: a `Response` body read
   twice in one test, and a test that accidentally targeted a
   registered user's own username instead of a distinct target,
   silently exercising the self-friendship rejection path instead of
   the intended "unknown username" path. Both caught immediately by
   the first fake-container test run.

## Problems Solved

1. Documented as a scoping decision in ADR-0026, not left ambiguous.
2. Fixed with a small `onlyForMethod` middleware wrapper scoping the
   rate limiter to `POST` only, in `routes/social/index.ts`.
3. Fixed by reading the already-parsed body instead of re-reading the
   `Response`, and by registering a distinct third username for the
   "unknown username" test case.

## Quality Gate Results

`pnpm install`, `pnpm build`, `pnpm lint`, `pnpm type-check`,
`pnpm format:check` -- all pass. `pnpm test`: 34/34 (16 Identity + 18
Social), no database. `pnpm test:db` (fresh disposable Postgres,
migrations reapplied): 39/39 (15 + 14 repository, 6 + 4 HTTP), run
twice independently during this phase with identical results.

## Lessons Learned

The atomic-conditional-`UPDATE` pattern Milestone 0.8 established for
refresh-token rotation generalizes cleanly to a completely different
domain (token consumption instead of token rotation) -- once the
pattern exists in the codebase, applying it correctly to a new
concurrency-sensitive write was mechanical, not a fresh design problem.
Method-agnostic middleware matching in Hono is an easy trap when two
different HTTP methods share one path with different security
requirements (rate limiting here); worth remembering for any future
route that mixes a sensitive `POST` with a normal `GET` on the same
path.

## Next Phase

Milestone 1.0 (PINChat MVP) once Milestones 0.2 and 0.4 (founder
document/architecture sign-off, tracked separately, not blocking
engineering work) are resolved. Not started as part of this phase, per
explicit instruction.
