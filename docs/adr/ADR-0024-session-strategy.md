# ADR-0024: Session Strategy — Short-Lived JWT Access Token + Rotating Opaque Refresh Token

- **Date:** 2026-07-25
- **Status:** Accepted

## Context

Identity needs session issuance, refresh, and revocation (per this
milestone's requirements): register, login, logout, session refresh,
session revocation, remember device. This requires deciding the token
model before implementing login/refresh use cases.

## Decision

Two-token pattern:

- **Access token**: short-lived (15 minutes), stateless JWT (HS256, via
  `jose`), carrying `userId`/`sessionId`/`deviceId`. Verified by
  signature alone — no database lookup per request.
- **Refresh token**: opaque random value (32 bytes), rotated on every
  use. Only its SHA-256 hash is stored (`refresh_tokens.token_hash`).
  Rotation chain tracked via `rotated_from_id`. Reuse of an
  already-rotated token triggers full session revocation (theft
  signal) — see
  [Session-Management.md](../security/Session-Management.md#reuse-detection).

Absolute max session lifetime: 30 days. Idle timeout: 14 days. Both
enforced in `apps/server/src/domain/identity/rules/session-lifetime.ts`.

## Alternatives Considered

- **Single long-lived JWT, no refresh token:** rejected — a stolen
  long-lived JWT can't be revoked (stateless by nature) short of
  maintaining a server-side blocklist, which forfeits the main benefit
  of using a JWT at all. The two-token pattern gets statelessness for
  the common case (every request) while keeping revocability where it
  matters (the rarer refresh).
- **Fully server-side sessions (opaque session ID only, DB lookup on
  every request):** rejected as the primary mechanism — correct and
  simple, but a DB round-trip per request is unnecessary overhead the
  JWT approach avoids; reconsider only if stateless verification proves
  insufficient in practice.
- **Non-rotating refresh token:** rejected — a static, long-lived
  refresh token that never changes is a bigger, longer-lived theft
  target with no way to detect that theft happened. Rotation-with-
  reuse-detection is the industry-standard mitigation (used by OAuth2
  refresh token rotation, among others) and was implemented directly
  rather than deferred.
- **Refresh token hashed with Argon2id (matching the credential):**
  rejected — Argon2id is deliberately slow, appropriate for a
  low-entropy secret that could be brute-forced. A refresh token is a
  high-entropy random value being looked up by exact match; a fast
  SHA-256 hash is correct and avoids unnecessary CPU cost on every
  refresh.

## Consequences

- Every request-path verification (except the refresh endpoint itself)
  is a pure signature check — no database dependency, favorable for
  scaling.
- Refresh is more expensive (DB read + write, hash computation) but
  happens roughly once per 15-minute access-token lifetime, not per
  request.
- A compromised access token is exploitable for at most 15 minutes,
  even with no revocation action taken — an acceptable window given the
  refresh token's rotation/reuse-detection covers the longer-lived
  risk.

## Tradeoffs

Two token types is more complexity than a single-token scheme, in
exchange for both statelessness (access token) and revocability
(refresh token) rather than picking one at the expense of the other.

## Future Implications

- Transport (how tokens actually reach the client) is documented as a
  plan, not yet implemented — see
  [Session-Management.md](../security/Session-Management.md#transport-planned--not-yet-wired-to-http).
  No HTTP/route layer exists yet for Identity.
- If access-token revocation before natural expiry becomes a hard
  requirement (e.g. "kill this session immediately, don't wait 15
  minutes"), a short-lived denylist keyed by `sessionId` would need to
  be added — not implemented now since the 15-minute window was judged
  acceptable.
