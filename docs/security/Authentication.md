# Authentication

**Status: Draft v2 — updated 2026-07-27 (Milestone 0.7, HTTP API layer), pending review**

Describes BlueMoon's platform authentication as implemented in
`apps/server/src/{domain,services,repositories,infrastructure,controllers,routes}/identity`.
This is the **Identity bounded context** — persistent platform accounts,
unrelated to PINChat's ephemeral session join-code. See
[ADR-0023](../adr/ADR-0023-identity-domain-model.md) for why these are
kept as two separate concepts.

## HTTP API

Nine endpoints, all under `/auth`, documented live at `GET /docs`
(Swagger UI) and `GET /openapi.json`:

| Endpoint                        | Auth required               | Rate limited      |
| ------------------------------- | --------------------------- | ----------------- |
| `POST /auth/register`           | No                          | Yes (5/hour/IP)   |
| `POST /auth/login`              | No                          | Yes (10/15min/IP) |
| `POST /auth/refresh`            | No (refresh cookie instead) | No                |
| `POST /auth/logout`             | Yes                         | No                |
| `POST /auth/change-credential`  | Yes                         | No                |
| `POST /auth/trust-device`       | Yes                         | No                |
| `DELETE /auth/trust-device/:id` | Yes                         | No                |
| `GET /auth/me`                  | Yes                         | No                |
| `GET /auth/devices`             | Yes                         | No                |

"Auth required" means `Authorization: Bearer <access token>` (see
[Session-Management.md](./Session-Management.md)), enforced by
`middleware/identity/require-auth.ts`. `register` auto-logs-in (calls
`registerUser` then `login` with the same submitted credential —
both untouched Milestone 0.6 use cases) rather than adding session
issuance to `registerUser` itself.

`DELETE /auth/trust-device/:id` closes a real gap:
`TrustedDeviceRepository.revoke(id)` has no built-in ownership check.
Since the route only carries a trust-grant ID in its path, `deviceId`
is required as a query parameter so the controller can confirm (via
the existing `findActiveByUserAndDevice`) that the trust grant
actually belongs to the caller before revoking it.

## Terminology Note (resolved)

**Internal code uses "credential"; user-facing UI copy uses "PIN."**
This document and the codebase use **credential** (also "authSecret" in
some discussion) for the numeric secret a user sets during registration
and uses to log in — every type, variable, database field, and
engineering doc reference stays "credential," unchanged. Once a UI
exists, anything a user reads on screen (labels, prompts, error text)
should say "PIN" instead. Database fields are not renamed. See
[ADR-0025](../adr/ADR-0025-credential-authentication.md#resolution)
for the full resolution — this was flagged as an open naming conflict
in Milestone 0.6/0.7 and closed by explicit instruction rather than
guessed at.

## Platform Identity

A BlueMoon account (`users` table) has:

- **Username** — permanent, chosen at registration, never changeable
  (see [Username Rules](#username-rules)).
- **Credential** — the authentication secret (see
  [Credential Rules](#credential-rules)); never stored in plaintext.
- **Email** — verification and account recovery only, never used
  socially (not yet implemented in code — schema/flows pending; see
  [Open Questions](../product/Product-Requirements-Document.md#open-questions)).
- **Devices / Trusted Devices** — see
  [Session-Management.md](./Session-Management.md#devices--trust).
- **Sessions** — see [Session-Management.md](./Session-Management.md).

## Username Rules

Implemented in `Username.create()`
(`apps/server/src/domain/identity/value-objects/username.ts`):

- Length: 3–20 characters.
- Format: must start with a lowercase letter; only lowercase letters,
  digits, and underscores after that (`^[a-z][a-z0-9_]*$`).
- Case handling: input is normalized to lowercase at validation time;
  uniqueness is case-insensitive by construction (there is no
  separate-case duplicate possible).
- Unicode policy: ASCII-only for v1. Deliberate — avoids
  homoglyph/confusable-character impersonation (e.g. Cyrillic "а" vs.
  Latin "a") without needing a full Unicode confusables table.
  Revisit only as a real, tracked decision if internationalized
  usernames become a requirement.
- Reserved names: a fixed list (`admin`, `root`, `support`, `help`,
  `api`, `bluemoon`, `pinchat`, `system`, `moderator`, `null`,
  `undefined`, `everyone`, `here`, `security`, `staff`) is rejected.
- Availability: checked at the repository layer
  (`UserRepository.findByUsername`), not in the value object — format
  validity and uniqueness are separate concerns.
- **Changing username is not supported.** No use case exists for it;
  this is intentional per product requirement, not an oversight.

## Credential Rules

Implemented in `Credential.create()`
(`apps/server/src/domain/identity/value-objects/credential.ts`):

- Length: 4–8 digits (see [Terminology Note](#terminology-note-resolved)
  — internal "credential," user-facing "PIN," digit range unchanged).
- Format: numeric only.
- Rejects a fixed list of trivial values (`0000`, `1234`, `123456`,
  etc.) — see the source for the full list.
- **Hashing: Argon2id**, via the `argon2` package
  (`apps/server/src/infrastructure/identity/hashing.ts`). Never stored
  or logged in plaintext — `Credential.reveal()` is the only way to
  extract the raw value, and it's called exactly once, at hash time.
- **Rotation**: supported via `changeCredential` use case
  (`apps/server/src/services/identity/change-credential.service.ts`).
  Requires the current credential to change it. Rotating invalidates
  every existing session for the account (see
  [Session-Management.md](./Session-Management.md#revocation)) — a
  stolen credential shouldn't leave old sessions valid after the
  legitimate owner changes it.
- **Forgot credential**: not yet implemented. Per product requirement,
  this must go through verified email — blocked on email
  verification/recovery infrastructure not existing yet (see Open
  Questions).

## Login Flow

Implemented in `login.service.ts`. One coherent orchestration (not
split into smaller functions) because every step depends on the
previous step's result and all of it belongs to the same
security-relevant audit trail:

1. Look up user by normalized username. Unknown username → generic
   `InvalidLoginError` (never reveals whether the username exists —
   see [ADR-0025](../adr/ADR-0025-credential-authentication.md)).
2. Check account lockout (`isLocked`) — locked accounts are rejected
   before credential verification even runs.
3. Verify credential (Argon2id). On failure: increment
   `failedLoginCount`, apply lockout if the threshold is reached (see
   [Lockout Policy](#lockout-policy)), record a `login_attempts` row,
   record a `login_failed` audit event, throw the same generic
   `InvalidLoginError`.
4. On success: reset `failedLoginCount`, upsert the device record
   (create if new fingerprint, else touch `lastSeenAt`), look up
   device trust status, create a session + refresh token, sign an
   access token, record the successful attempt and a `login` audit
   event.

## Lockout Policy

Implemented in `apps/server/src/domain/identity/rules/lockout-policy.ts`:

- **Threshold**: 5 consecutive failed attempts (`MAX_FAILED_LOGIN_ATTEMPTS`).
- **Duration**: 15 minutes (`LOCKOUT_DURATION_MS`), from the moment the
  threshold is crossed.
- A successful login at any point resets `failedLoginCount` to 0.

## Rate Limiting

Implemented in `apps/server/src/infrastructure/identity/rate-limiter.ts`
— a fixed-window, in-memory limiter, wrapped as Hono middleware in
`middleware/identity/rate-limit.ts`. Wired endpoints:

| Action                 | Limit                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/register`  | 5 per hour per IP                                                                                                                 |
| `POST /auth/login`     | 10 per 15 minutes per IP (on top of the per-account [Lockout Policy](#lockout-policy))                                            |
| `POST /auth/ws-ticket` | 30 per minute per IP (bounds how fast a caller can mint WS connection tickets — see [Messaging.md](./Messaging.md#rate-limiting)) |

No username-availability-lookup endpoint exists yet (not part of the
9 routes built in Milestone 0.7) — rate limiting it is deferred until
one does.

**IP extraction** (`infrastructure/identity/client-ip.ts`): trusts the
_last_ entry in `x-forwarded-for`, on the assumption of exactly one
trusted reverse proxy in front of this process (Railway's edge — see
[ADR-0031](../adr/ADR-0031-deployment-architecture.md)). Each hop a
request passes through appends its own view of the client IP to the
header, so the entry closest to this server is the one the trusted
proxy itself set; every earlier entry is client-supplied and
spoofable. An earlier version of this function took the _first_
entry, which let any caller defeat every per-IP rate limiter in this
codebase simply by sending a different `x-forwarded-for` value per
request — fixed as part of the 2026-08-13 production-hardening pass,
before this codebase was ever deployed behind a real proxy. If a
second proxy hop is introduced in front of Railway's edge (e.g. a
CDN), this single-hop assumption needs revisiting.

**Known limitation** (documented at the source): the rate limiter is
single-process and not distributed. A multi-instance deployment
effectively multiplies the limit by instance count. Must move to a
shared store (e.g. Redis) before horizontal scaling — tracked in
[TODO.md](../../TODO.md).

## Audit

Every security-relevant Identity event is written to the `audit_events`
table via `AuditWriter`
(`apps/server/src/infrastructure/identity/audit-writer.ts`). Event
vocabulary (`apps/server/src/events/identity-events.ts`):

`registration`, `login`, `login_failed`, `logout`, `credential_changed`,
`device_trusted`, `device_trust_revoked`, `session_revoked`.

Each event carries `userId` (nullable — e.g. a failed login against an
unknown username), `ipAddress`, and optional `metadata`.

## Related Documents

- [Session-Management.md](./Session-Management.md)
- [Identity-Schema.md](../database/Identity-Schema.md)
- [ADR-0023 Identity Domain Model](../adr/ADR-0023-identity-domain-model.md)
- [ADR-0024 Session Strategy](../adr/ADR-0024-session-strategy.md)
- [ADR-0025 Credential-Based Authentication](../adr/ADR-0025-credential-authentication.md)
- [Product Requirements Document](../product/Product-Requirements-Document.md)
