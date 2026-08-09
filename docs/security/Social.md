# Social — BlueMoon Token & Friendship Security

**Status: Implemented — Milestone 0.9.**

Describes the BlueMoon Token and friendship security model implemented
in `apps/server/src/{domain,services,infrastructure,repositories}/social`.
See [ADR-0026](../adr/ADR-0026-blue-moon-token.md) for the decision
record and [Product-Requirements-Document.md](../product/Product-Requirements-Document.md#bluemoon-token)
for the product specification this implements.

## Core Principle

"You decide who can reach you." A username alone is never sufficient
to establish a friendship — every friendship is created by consuming a
BlueMoon Token, which only the target account's owner can generate.

## What the Token Is Not

Explicit, not incidental: a BlueMoon Token is **not** an authentication
credential, **not** a login credential, **not** an OTP, and consuming
one **never** grants account or session access. Every Social endpoint
still requires an existing authenticated session (Identity's
`requireAuth` middleware, unmodified) — generating or consuming a token
presupposes the caller is already logged in via the normal
credential/session flow ([Authentication.md](./Authentication.md),
[Session-Management.md](./Session-Management.md)).

## Generation

`POST /social/blue-moon-tokens`, authenticated. `ownerId` always comes
from the caller's session (`c.get("auth").userId`) — never a request
field — so a user can only ever generate a token for themselves. The
raw token (32 random bytes, base64url-encoded — `randomBytes(32)`, same
entropy as a refresh token) is returned exactly once, in the
generation response; only its SHA-256 hash is persisted
(`blue_moon_tokens.token_hash`). No API response, at generation or
anywhere else, ever includes a token hash.

## Expiry

Exactly 300 seconds from generation
(`BLUE_MOON_TOKEN_TTL_MS` in `domain/social/rules/token-lifetime.ts`),
enforced by the same atomic query that checks single-use (see below) —
`expires_at > now()` is part of the one conditional `UPDATE`, not a
separate check.

## Single-Use and Concurrency

Consumption is one atomic, conditional database statement:

```sql
UPDATE blue_moon_tokens
SET consumed_at = now(), consumed_by_user_id = $consumer
WHERE token_hash = $hash
  AND owner_id = $owner
  AND consumed_at IS NULL
  AND expires_at > now()
RETURNING *;
```

If two requests race to consume the same token, PostgreSQL's row-level
locking guarantees at most one `UPDATE` matches — the other returns
zero rows. There is no separate "look up the token, check it's valid,
then update it" sequence, which is the exact TOCTOU pattern
[Milestone 0.8](./Session-Management.md#concurrent-rotation-milestone-08)
found and fixed in refresh-token rotation. Verified directly: firing
two concurrent consumption requests for the same token against a real
PostgreSQL instance resolves to exactly one success and one rejection,
every time (`social-repositories.integration.test.ts`,
`friendships.routes.integration.test.ts`).

The consumption `UPDATE` and the resulting friendship `INSERT` happen
inside one `db.transaction()` — see [ADR-0026](../adr/ADR-0026-blue-moon-token.md)
for why both writes must succeed or fail together.

## Anti-Enumeration

Every way a consumption attempt can fail — the target username doesn't
resolve to an account, the token doesn't exist, it belongs to a
different owner, it's expired, or it was already consumed — surfaces
as the same generic `BlueMoonTokenInvalidError` (401). Distinguishing
any of these would let a caller enumerate registered usernames or
probe a token's state one bit at a time; same reasoning as
[Authentication.md](./Authentication.md)'s login error handling.

## Authorization

- **Generation:** always self — `ownerId` is never client-supplied.
- **Consumption:** requires an authenticated session; a user consuming
  their own token is explicitly rejected (`CannotFriendSelfError`, 409)
  before the database is touched.
- **Friendship removal:** either participant may remove a friendship —
  there is no asymmetric "owner" of a friendship once established.
  Enforced by an explicit ownership check in
  `remove-friendship.service.ts` (not delegated to a constraint, since
  "you're a participant" isn't expressible as one).

## Rate Limiting

Same in-memory, per-process limiter as Identity (see
[Authentication.md](./Authentication.md#rate-limiting) for its
documented single-process limitation). Token generation is capped like
account creation (10/hour/IP); token consumption is capped like login
(10/15min/IP) — the closest analog to "guessing a secret," even though
32 bytes of entropy makes brute-forcing the token itself computationally
infeasible regardless.

## Audit

Every generation, failed consumption, successful friendship creation,
and friendship removal is recorded to the same `audit_events` table
Identity uses (`infrastructure/social/audit-writer.ts`,
`events/social-events.ts`) — one audit trail across bounded contexts,
distinct typed event unions per context.
