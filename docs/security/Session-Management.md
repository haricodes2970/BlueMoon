# Session Management

**Status: Draft v2 — updated 2026-07-27 (Milestone 0.7, transport implemented), pending review**

Describes the session/token strategy implemented in
`apps/server/src/{domain,services,infrastructure,repositories}/identity`.
See [ADR-0024](../adr/ADR-0024-session-strategy.md) for the decision
record.

## Strategy Summary

Two-token pattern: a short-lived, stateless **access token** (JWT) plus
a long-lived, rotating, server-tracked **refresh token**.

| Property            | Access Token                                        | Refresh Token                                                                |
| ------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------- |
| Format              | JWT (HS256), via `jose`                             | Opaque random value (32 bytes, base64url)                                    |
| Storage server-side | None (stateless, verified by signature)             | Hash only (SHA-256), never the raw value                                     |
| Lifetime            | 15 minutes (`ACCESS_TOKEN_TTL_MS`)                  | 30 days (`REFRESH_TOKEN_TTL_MS`), reset on each rotation                     |
| Rotation            | N/A — simply re-issued via refresh                  | On every use — old token revoked, new one issued, linked via `rotatedFromId` |
| Carries             | `sub` (userId), `sid` (sessionId), `did` (deviceId) | Nothing — it's a lookup key, resolved server-side to a `sessions` row        |

## Why a JWT for the Access Token but Not the Refresh Token

The access token is verified on every request and should not require a
database round-trip — a signed, short-lived JWT gives stateless
verification. The refresh token is used far less often (once per
access-token expiry) and must be revocable and rotation-tracked, which
a stateless JWT cannot provide — an opaque, database-backed token is
the correct tool there. Using Argon2id (slow, intentionally) for the
refresh token would be wrong: it's a high-entropy random value being
looked up, not a low-entropy secret being brute-forced offline, so a
fast SHA-256 hash is used instead (see
`apps/server/src/infrastructure/identity/refresh-token.ts`).

## Transport

Implemented as of Milestone 0.7 (`apps/server/src/infrastructure/identity/cookies.ts`,
`controllers/identity/auth.controller.ts`):

- **Access token**: returned in the JSON response body
  (`{ success: true, data: { accessToken, ... } }`). Client is expected
  to hold it in memory (not `localStorage`, to reduce XSS exposure) and
  attach it as `Authorization: Bearer <token>` on subsequent requests.
- **Refresh token**: set as an `httpOnly` cookie (`bm_refresh`),
  `Secure` outside `development`, scoped to `/auth` -- never exposed to
  client-side JavaScript. `POST /auth/refresh` reads it from the
  cookie, not a request body. The application-layer services
  themselves remain transport-agnostic (they take/return the raw token
  string); cookie-setting is entirely a controller-layer concern.
- **SameSite** is `COOKIE_SAME_SITE` (env.ts, default `"Lax"`), not
  hardcoded. `Lax` is correct when `apps/web` and `apps/server` share a
  registrable domain (e.g. `app.example.com` / `api.example.com`);
  browsers never attach a `Lax` cookie to a cross-site `fetch()`, so a
  deployment across two unrelated domains (default Vercel/Railway
  domains) needs `"None"` instead. `"None"` is only accepted when
  `NODE_ENV=production` (env.ts fails fast otherwise, since a
  `SameSite=None` cookie must also be `Secure`). See
  [ADR-0031](../adr/ADR-0031-deployment-architecture.md) and
  [`docs/deployment/README.md`](../deployment/README.md).
- CORS (`app.ts`) sets `credentials: true` alongside `origin:
WEB_ORIGIN` -- required for the browser to store/send this cookie on
  a cross-origin request at all; without it, `Set-Cookie` on a
  cross-origin response is silently ignored regardless of `SameSite`.
  `apps/web`'s fetch wrapper (`lib/api-client.ts`) sends
  `credentials: "include"` on every request to match.
- `apps/web` didn't call `POST /auth/refresh` at all before the
  2026-08-13 production-hardening pass -- an access token expiring
  (15 minutes) had no recovery path short of logging in again. The
  fetch wrapper now retries a 401 exactly once via a coalesced silent
  refresh (concurrent 401s share one in-flight refresh call, not one
  each), updating the client-side access token in place. If the
  refresh cookie itself is gone/expired/revoked, the original 401 is
  surfaced and client auth state is cleared.

Verified via the Vitest integration suite
(`routes/identity/auth.routes.test.ts`): cookie set on register/login/
refresh, cookie cleared on logout, and `POST /auth/refresh` with no
cookie rejected with 401.

## Lifetime Rules

Implemented in
`apps/server/src/domain/identity/rules/session-lifetime.ts`:

- **Maximum session lifetime**: 30 days (`SESSION_MAX_LIFETIME_MS`)
  from session creation, regardless of activity. Enforced via the
  session's `expiresAt` column, set once at creation
  (`computeSessionExpiry`).
- **Idle timeout**: 14 days (`SESSION_IDLE_TIMEOUT_MS`). If a session
  goes this long without a refresh, the next refresh attempt revokes it
  and rejects (`isIdleTimedOut`, checked in `refresh-session.service.ts`).
- **Access token TTL**: 15 minutes (`ACCESS_TOKEN_TTL_MS`).
- **Refresh token TTL**: 30 days from issuance, but in practice reset
  on every rotation (`computeRefreshTokenExpiry`), so an actively-used
  session's refresh token effectively never approaches this ceiling —
  it only matters for an abandoned-but-not-yet-idle-timed-out session.

## Rotation

Implemented in `refresh-session.service.ts`. On every refresh:

1. Look up the refresh token by hash. Not found → reject
   (`SessionExpiredError`).
2. If found but already revoked → **reuse detected** (see below).
3. If found, active, but the underlying session is expired/idle-timed-out
   → revoke the session and reject.
4. Otherwise: revoke the presented token, generate and store a new one
   (`rotatedFromId` links it to the one it replaced), touch the
   session's `lastActiveAt`, sign a fresh access token.

## Reuse Detection

If a refresh token that has already been revoked (i.e. already rotated
once) is presented again, that is treated as evidence of theft — a
legitimate client would only ever hold the _current_ token, since the
old one was invalidated the moment it was used. The response: revoke
the entire session and every refresh token under it (not just reject
the one request), record a `session_revoked` audit event with
`reason: "refresh_token_reuse"`, and throw `RefreshTokenReuseError`.

Verified behavior (see the Milestone 0.6 application-layer commit):
after a reuse-triggered session kill, even the _legitimately
rotated-forward_ token stops working — the whole session is dead, not
just the stolen/reused token.

### Concurrent Rotation (Milestone 0.8)

Real-database testing surfaced a TOCTOU gap the in-memory fakes
couldn't: two concurrent requests presenting the same still-active
token could both pass the "is this active?" check and both proceed to
rotate it, producing two valid children of one parent token —
`RefreshTokenRepository.revoke(id)` was an unconditional `UPDATE`, so
neither request could tell it had raced the other.

Fixed by making `revoke(id)` an atomic conditional update
(`WHERE revoked_at IS NULL ... RETURNING`) that returns the revoked
row only to whichever caller's `UPDATE` actually flipped it, `null` to
the other. `refresh-session.service.ts` now checks this: a `null`
result is treated identically to detected reuse — the entire session
is killed — since it's the same underlying signal (two presentations
of one token), just caught earlier via the race instead of via a
second explicit reuse. Verified against a real PostgreSQL instance
with two concurrent `revoke()` calls on one token (see
`identity-repositories.integration.test.ts`); Postgres's row-level
locking guarantees exactly one wins.

## Revocation

Three paths, all ending in the same state (session + every refresh
token under it marked revoked):

- **Logout** (`logout.service.ts`) — revokes one session by ID.
- **Explicit session revocation** (`revoke-session.service.ts`) — a
  user revoking a specific session (e.g. "log out this device"),
  authorization-checked against `requestingUserId`.
- **Credential change** (`change-credential.service.ts`) — revokes
  _every_ session and refresh token for the user, not just one. See
  [Authentication.md](./Authentication.md#credential-rules).
- **Reuse detection** (above) — revokes the one affected session.

Revocation never deletes rows — `revokedAt` is set, preserving the
audit trail.

## Devices & Trust

- **Device**: identified by a client-supplied fingerprint, scoped per
  user (`devices` table, unique on `(user_id, fingerprint)`). Created
  on first login from a new fingerprint; `lastSeenAt` touched on
  subsequent logins.
- **Trusted Device** ("remember this device"): a separate table
  (`trusted_devices`), not a flag on `devices` — deliberately, so trust
  can be granted, revoked, and re-granted independently over a device's
  lifetime, with its own `expiresAt`/`revokedAt`. `login.service.ts`
  reports `deviceTrusted` on every login by checking for an active
  trust grant; what a trusted device changes about the login flow
  itself (e.g. skipping a second factor) is not yet defined — no such
  second factor exists yet.

## Related Documents

- [Authentication.md](./Authentication.md)
- [Identity-Schema.md](../database/Identity-Schema.md)
- [ADR-0024 Session Strategy](../adr/ADR-0024-session-strategy.md)
