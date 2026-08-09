# Phase 0.8 — Real PostgreSQL Integration & Repository Verification

**Status: Complete** | **Dates:** 2026-08-09

## Purpose

Milestones 0.6/0.7 built the Identity domain/application/HTTP layers
and verified them against in-memory fakes only — no live PostgreSQL
instance was available in that environment. This phase closes that
gap: prove the existing schema, migration, and Drizzle-backed
repositories actually work against a real database, not just their
fake substitutes, without redesigning or rebuilding anything already
built.

## Goals

- A disposable local PostgreSQL instance for development/testing.
- Real-database integration tests covering the behaviors that matter:
  unique/FK/index constraints, CRUD round-trips, cascade deletes,
  connection pooling under concurrency.
- Verify the existing migration applies cleanly to a fresh database.
- Verify the security-critical flows (lockout, refresh rotation, reuse
  detection, trusted-device revoke, credential change) end-to-end
  through the real HTTP API backed by real repositories.
- Fix any real correctness issue real-database testing surfaces —
  and only if it's real, not invented.
- Keep `pnpm test` (the existing 16 fake-based tests) database-free —
  new real-DB coverage is additive, opt-in, and separately invoked.

## Tasks

- [x] `docker-compose.yml` — local disposable PostgreSQL
- [x] `apps/server/src/test-utils/real-db.ts` — test harness
      (`TEST_DATABASE_URL`/`DATABASE_URL` detection, table reset)
- [x] `apps/server/vitest.integration.config.ts` +
      `apps/server/vitest.config.ts` exclusion — real-DB tests never
      run under plain `pnpm test`
- [x] `pnpm test:db` script (server + root + turbo.json)
- [x] Repository-level integration tests
      (`identity-repositories.integration.test.ts`, 15 tests)
- [x] HTTP-level integration tests
      (`auth.routes.integration.test.ts`, 6 tests)
- [x] Migration verified against a fresh database
- [x] Real correctness issue found and fixed: refresh-token rotation
      TOCTOU race
- [x] Docs updated (this document, Session-Management.md, CLAUDE.md,
      ROADMAP.md, TODO.md, CHANGELOG.md, Engineering Journal,
      Identity-Schema.md, `.env.example`)

## Completed Work

**Local PostgreSQL** (`docker-compose.yml`, root): one `postgres:16-alpine`
service, credentials matching `apps/server/.env.example`'s
`DATABASE_URL` default, healthcheck-gated. `docker compose up -d postgres`
is the entire setup step; not required in CI (real-DB tests are opt-in,
not part of `pnpm test`).

**Test harness** (`apps/server/src/test-utils/real-db.ts`):
`getTestDatabaseUrl`/`hasTestDatabase` read `TEST_DATABASE_URL` first,
falling back to `DATABASE_URL`, so a real dev/prod database is never
accidentally reused as a truncation target unless nothing else is
configured. `resetIdentityTables` truncates all seven Identity tables
(`CASCADE` handles FK order) between test cases.

**Test split**: real-DB tests live in `*.integration.test.ts` files,
explicitly excluded from `vitest.config.ts`'s default include and
picked up only by `vitest.integration.config.ts` (`fileParallelism:
false` — tests share one database and reset it between cases, so
can't run concurrently against each other). `pnpm test:db` runs them;
`pnpm test` never touches a database. Both test files self-skip
(`describe.skipIf(!hasTestDatabase())`) if no database is configured,
so they're also safe to leave in a checkout with no Postgres running.

**Repository-level tests**
(`repositories/identity/identity-repositories.integration.test.ts`,
15 tests): user creation + unique username constraint, FK rejection
(device referencing a nonexistent user), device
`unique(user_id, fingerprint)`, trusted-device create/find-active/revoke,
session create/touch/revoke, cascade delete (deleting a user cascades
to their sessions), refresh-token `unique(token_hash)`, the
concurrent-revoke race fix (see below), login-attempt record/query,
audit-event persistence, and 20 concurrent user-creation/read queries
over the shared connection pool.

**HTTP-level tests**
(`routes/identity/auth.routes.integration.test.ts`, 6 tests): the same
`createApp`/route/controller/service code as
`auth.routes.test.ts`, wired to a real
`createIdentityContainer(db, secret)` instead of the in-memory fake —
register + duplicate-username rejection, 5-failed-attempt lockout,
refresh rotation + reuse-detection session kill, trust-device
create/revoke via the API, change-credential invalidating the old
credential and session, logout.

**Migration verified against a fresh database**: `pnpm --filter
@bluemoon/database db:migrate` against the freshly-created Docker
Postgres applied `0000_lame_deadpool.sql` with no errors. Confirmed via
`psql`: all 7 tables, all 5 foreign keys with the designed
`ON DELETE CASCADE`/`SET NULL` behavior, both unique constraints
(`users.username`, `refresh_tokens.token_hash`), and all 13 explicit
indexes plus 7 primary-key indexes present exactly as `schema/*.ts`
specifies.

**Real correctness issue found and fixed — refresh-token rotation
race**: `RefreshTokenRepository.revoke(id)` was an unconditional
`UPDATE`. Two concurrent requests presenting the same still-active
refresh token could both pass `isRefreshTokenActive`, both call
`revoke()` (each succeeding, since neither checked the other's write),
and both mint a new token `rotatedFromId`-linked to the same parent —
defeating the single-child-per-parent invariant reuse detection
depends on. Fixed by making `revoke(id)` an atomic conditional update
(`WHERE revoked_at IS NULL ... RETURNING`), returning the row only to
the caller whose `UPDATE` actually flipped it, `null` to the loser.
`refresh-session.service.ts` now treats a `null` result identically to
already-detected reuse: kill the whole session. See
[Session-Management.md](../security/Session-Management.md#concurrent-rotation-milestone-08)
for the full writeup. Verified with a real-Postgres test firing two
concurrent `revoke()` calls on one token and asserting exactly one
winner.

No other multi-write flow (e.g. login's session-then-refresh-token
creation) was changed — those fail safe on partial failure (an orphan
row, not a security gap) and fixing them wasn't a real issue this
phase surfaced; not invented.

## Files Created

`docker-compose.yml`, `apps/server/src/test-utils/real-db.ts`,
`apps/server/vitest.integration.config.ts`,
`apps/server/src/repositories/identity/identity-repositories.integration.test.ts`,
`apps/server/src/routes/identity/auth.routes.integration.test.ts`,
`docs/phases/Phase-0.8.md` (this document).

## Files Modified

`apps/server/src/repositories/identity/refresh-token.repository.ts`
(atomic `revoke`), `apps/server/src/services/identity/refresh-session.service.ts`
(handle lost-race case), `apps/server/src/test-utils/fake-identity-container.ts`
(matching `revoke` return type, kept behaviorally identical),
`apps/server/vitest.config.ts` (exclude `*.integration.test.ts`),
`apps/server/package.json` (`test:db` script), `package.json` (root
`test:db` script), `turbo.json` (`test:db` task), `apps/server/.env.example`
(`TEST_DATABASE_URL` documented), `docs/security/Session-Management.md`,
`docs/database/Identity-Schema.md`, `CLAUDE.md`, `ROADMAP.md`,
`TODO.md`, `CHANGELOG.md`, `docs/engineering/Engineering-Journal.md`.

## Architecture Decisions

None — the rotation-race fix is an implementation-level correctness
fix within the already-accepted [ADR-0024](../adr/ADR-0024-session-strategy.md)
session strategy, not a new architectural decision.

## Problems Found

1. Real correctness bug: refresh-token rotation race (see above) —
   only reachable with a real database's actual concurrent-transaction
   semantics; the in-memory fakes are single-threaded and couldn't
   have surfaced it.
2. Test-authoring bug (not a product bug): initial integration tests
   generated default usernames from a raw UUID, exceeding
   `users.username`'s `varchar(20)` — caught immediately by the first
   real-Postgres test run, fixed by shortening the generated IDs.
3. Tooling gap found while closing this milestone: root `pnpm test:db`
   silently skipped every test (`hasTestDatabase()` returned false)
   because Turbo strips environment variables from a task's shell
   unless the task explicitly declares them under `env` — running via
   `pnpm --filter @bluemoon/server test:db` (bypassing Turbo) had
   masked this the whole time it was being developed.

## Problems Solved

1. Fixed via atomic conditional `revoke()`, described above.
2. Fixed by generating short (≤20-char) usernames in test helpers.
3. Fixed by adding `"env": ["TEST_DATABASE_URL", "DATABASE_URL"]` to
   `turbo.json`'s `test:db` task. Re-verified: root `pnpm test:db`
   now passes 21/21 against a freshly recreated disposable database.

## Quality Gate Results

`pnpm install`, `pnpm build`, `pnpm lint`, `pnpm type-check`, `pnpm test`,
`pnpm format:check` — all pass. `pnpm test` unchanged at 16/16 (fake
container, no database). `pnpm test:db` (new, opt-in, run explicitly
against the local Docker Postgres): 21/21 passing — 15 repository
tests, 6 HTTP-integration tests.

## Lessons Learned

The in-memory fakes built in Milestone 0.6/0.7 were accurate enough
that essentially everything worked against real Postgres on the first
pass — the one real bug they couldn't have caught was a genuine
concurrency race, which is exactly the class of bug fakes are
structurally unable to surface (no real transactions, no real
row-level locking, effectively single-threaded). That's a point in
favor of keeping both test tiers rather than replacing fakes with
real-DB tests everywhere: fast fakes for logic, real database for
concurrency/constraint/persistence guarantees.

## Next Phase

Milestone 0.9 — Social/Friendship + BlueMoon Token — once founder
sign-off items tracked in CLAUDE.md/TODO.md/ROADMAP.md (real product
documents, architecture review) are resolved. Not started as part of
this phase.
