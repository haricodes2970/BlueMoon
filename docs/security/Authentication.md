# Authentication

**Status: Draft v1 — authored 2026-07-25, pending review**

Describes BlueMoon's platform authentication as implemented in
`apps/server/src/{domain,services,repositories,infrastructure}/identity`.
This is the **Identity bounded context** — persistent platform accounts,
unrelated to PINChat's ephemeral session join-code. See
[ADR-0023](../adr/ADR-0023-identity-domain-model.md) for why these are
kept as two separate concepts.

## Terminology Note (open conflict — see below)

This document and the codebase use **credential** (also "authSecret" in
some discussion) for the numeric secret a user sets during registration
and uses to log in. This was an explicit instruction: avoid the word
"PIN" for platform authentication so it isn't confused with PINChat's
unrelated session join-code.

A later instruction reintroduced "4–6 digit PIN" as the platform
identity term, which conflicts with both the earlier naming instruction
and the already-implemented, tested value object
(`CREDENTIAL_MIN_LENGTH = 4`, `CREDENTIAL_MAX_LENGTH = 8` — see
`apps/server/src/domain/identity/value-objects/credential.ts`). Per the
Product Documentation Policy, this conflict is being raised rather than
silently resolved either way. **Unresolved — needs a decision**: keep
"credential" + 4–8 digits, or rename to match the newer "PIN" + 4–6
spec (which would require code changes, not just a documentation
rename). See Open Questions in the
[Product Requirements Document](../product/Product-Requirements-Document.md#open-questions).

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

- Length: 4–8 digits (see [Terminology Note](#terminology-note-open-conflict--see-below)
  for the open conflict with a newer "4–6" spec).
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
— a fixed-window, in-memory limiter. **Not yet wired to any endpoint**
(no HTTP layer exists yet for Identity as of this writing).

Planned limits (to be applied once routes exist, not yet enforced):

| Action                       | Limit (planned)                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| Registration                 | Per-IP, to be finalized when routes are built                                          |
| Login                        | Per-username and per-IP, to be finalized when routes are built                         |
| Credential attempts          | Covered by [Lockout Policy](#lockout-policy) (per-account) plus rate limiting (per-IP) |
| Username availability lookup | Per-IP, to be finalized when routes are built                                          |

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
