# Session Management

**Status: Draft v1 — authored 2026-07-25, pending review**

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

## Transport (planned — not yet wired to HTTP)

No API/route layer exists yet for Identity (as of this writing —
Milestone 0.6 stopped at the application layer per explicit scope). The
intended transport, to be implemented when routes are built:

- **Access token**: returned in the JSON response body. Client holds it
  in memory (not `localStorage`, to reduce XSS exposure), attaches it
  as `Authorization: Bearer <token>`.
- **Refresh token**: intended to be set as an `httpOnly`, `Secure`,
  `SameSite=Lax` cookie — never exposed to client-side JavaScript. The
  service layer currently returns the raw refresh token as a string
  (transport-agnostic); cookie-setting is an HTTP-layer concern for the
  future routes to add, not something the service layer should know
  about.

This is a plan, not yet implemented — flagged explicitly so it isn't
mistaken for shipped behavior.

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
