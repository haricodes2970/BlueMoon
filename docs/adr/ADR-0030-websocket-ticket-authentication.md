# ADR-0030: Short-Lived, Single-Use Ticket for WebSocket Authentication

- **Date:** 2026-08-13
- **Status:** Accepted

## Context

Milestone 1.0 (ADR-0028) authenticated `/messaging/ws` by presenting
the same long-lived access token used for HTTP as a query-string
parameter (`?access_token=`), because a browser cannot set custom
headers during a native WebSocket handshake. A security hardening pass
flagged this as unacceptable for a privacy-first platform: URLs are
logged by proxies, browser history, referrer headers, and server
access logs far more readily than headers or bodies are, so a
long-lived bearer credential placed there is exposed well beyond its
intended lifetime and audience.

The fix had to preserve every existing security property: no weakening
of the refresh-token cookie (`httpOnly`, `secure` in production,
`SameSite=Lax`, `path: "/auth"`), no change to existing HTTP
authentication, and no new general-purpose authentication token.

**Why not the existing refresh-token cookie?** Inspected directly
(`infrastructure/identity/cookies.ts`) before deciding against it:

- It is scoped to `path: "/auth"` — it would never be sent on a
  `/messaging/ws` upgrade request without widening that scope, which
  itself would be a cookie-security regression the brief explicitly
  forbade.
- It is `SameSite=Lax`; `apps/web` and `apps/server` run on different
  origins in this deployment model, and reliably sending a `Lax`
  cookie on a WS upgrade request across origins is not something to
  depend on without changing to `SameSite=None` + `Secure` — again, a
  cookie-security change this task was scoped to avoid.
- It carries only an opaque rotating refresh token, not
  `{userId, sessionId, deviceId}` claims — using it directly would mean
  `requireWsAuth` doing a full session-repository round trip per
  connection attempt, a materially different verification path than
  today's stateless access-token check, not a drop-in replacement.

## Decision

**A dedicated, short-lived, single-use WS ticket**, generated over an
already-authenticated HTTPS request and consumed exactly once at the
WS handshake:

1. An authenticated caller (`Authorization: Bearer <access token>`)
   calls `POST /auth/ws-ticket`.
2. The server generates 32 cryptographically random bytes
   (`infrastructure/identity/ws-ticket.ts#generateWsTicket`).
3. Only its SHA-256 hash is stored (`ws_tickets.ticket_hash`, unique) —
   the raw value is never persisted.
4. The row also stores the issuing `user_id`, `session_id`, `device_id`
   (denormalized directly, not derived via a join at consume time —
   `requireWsAuth` needs exactly the same shape `AccessTokenPayload`
   already provides), a 30-second expiry
   (`WS_TICKET_TTL_MS`, `domain/identity/rules/session-lifetime.ts`),
   and `consumed_at: null`.
5. The raw ticket is returned to the caller exactly once, in the
   response body — never logged, never re-derivable from the hash.
6. The browser opens `/messaging/ws?ticket=<raw ticket>`.
7. `requireWsAuth` (`middleware/identity/require-ws-auth.ts`) hashes
   the presented value and atomically consumes the matching row with a
   single conditional `UPDATE ws_tickets SET consumed_at = now() WHERE
ticket_hash = $1 AND consumed_at IS NULL AND expires_at > now()
RETURNING *` — the identical exactly-once-consumption pattern
   already proven for refresh-token rotation (Milestone 0.8) and
   BlueMoon Token consumption (Milestone 0.9).
8. A `null` result (missing, invalid, expired, or already-consumed)
   rejects the handshake with a generic 401 before any socket opens —
   the same "no distinguishing information" behavior `requireAuth`
   already uses.

**Deliberately separate module, not shared with authentication
infrastructure.** `infrastructure/identity/ws-ticket.ts` duplicates the
random-value/hash-at-rest shape of `infrastructure/identity/
refresh-token.ts` rather than importing from it — the same reasoning
already applied to `infrastructure/social/blue-moon-token.ts`: a WS
ticket is not a refresh token and must not share a module with one,
even though the underlying primitive (32 random bytes, SHA-256 of the
lookup value) is identical. A fast hash is correct here, same
justification as the other two: this is a high-entropy lookup key
being redeemed once, not a low-entropy secret being brute-forced
offline.

**No audit-log entry on ticket issuance.** Every other Identity
use case (`register`, `login`, `logout`, `refreshSession`,
`revokeSession`, `trustDevice`, `revokeDeviceTrust`,
`changeCredential`) calls `audit.record(...)`. `issueWsTicket`
deliberately does not: a ticket is requested once per WS
(re)connection attempt — every browser tab, every network blip, every
tab left open overnight reconnecting — and would flood the audit log
with a volume of near-identical, low-signal events that ADR-0020's
audit logging design never anticipated. The security-relevant event is
still recorded at both ends of the flow that matters: registration/
login already audits how the underlying session was established, and
the WS message-send path already covers the operations a ticket
actually gates access to.

## Alternatives Considered

- **Reuse the refresh-token cookie for WS auth:** rejected — see
  Context above; would require weakening cookie scope or `SameSite`,
  or replacing `requireWsAuth`'s stateless verification with a
  per-connection session lookup, either of which is a larger and
  riskier change than the ticket model for the same outcome.
- **Shorten the access token's TTL and keep it in the query string:**
  rejected — still places a bearer credential capable of authenticating
  every other endpoint in a URL; the brief's requirement is that the
  WS credential must not double as, or be indistinguishable from, the
  general-purpose access token.
- **A general-purpose short-lived token usable for any endpoint:**
  rejected — the brief explicitly forbids inventing another
  general-purpose authentication token; the ticket is intentionally
  narrow (WS handshake only, single-use, cannot authenticate ordinary
  HTTP requests, cannot replace the access/refresh pair).
- **In-memory (non-persisted) ticket store:** rejected in favor of a
  Postgres-backed table — the exactly-once-consumption guarantee under
  concurrent requests needs the same atomic conditional `UPDATE` every
  other single-use token in this codebase relies on; an in-memory store
  would also break the moment `apps/server` runs as more than one
  process, and the task explicitly forbade introducing Redis as a
  workaround.

## Consequences

- New table `ws_tickets` (migration `0003_dashing_network.sql`):
  `id`, `session_id` (FK → `sessions.id`, `ON DELETE CASCADE`),
  `user_id`, `device_id`, `ticket_hash` (unique), `expires_at`,
  `consumed_at`, `created_at`; indexed on `session_id` and
  `expires_at`.
- New endpoint `POST /auth/ws-ticket`, authenticated by the existing,
  unmodified `requireAuth` middleware — no change to how a caller
  proves who they are to get a ticket in the first place.
- `requireWsAuth`'s signature changed from `(accessTokens:
AccessTokenService)` to `(wsTickets: WsTicketRepository)`; its
  external contract (mounted immediately before `upgradeWebSocket`,
  throws `UnauthorizedError` on failure, sets `c.get("auth")` on
  success) is unchanged.
- The old `?access_token=` scheme no longer authenticates anything —
  a request using it is treated identically to a request with no
  ticket at all (missing `ticket` query param), rejected with 401.
- `apps/web`'s WS client now performs an extra HTTPS round trip
  (`POST /auth/ws-ticket`) before every connection attempt, including
  reconnects — a small, one-time-per-connection latency cost in
  exchange for bounding URL credential exposure to a 30-second,
  single-use value instead of the full access-token lifetime.

## Tradeoffs

An extra network round trip is required before every WebSocket
connection attempt (initial connect and every reconnect), which the
previous scheme didn't need. Accepted: the round trip is over
HTTPS, uses the existing `Authorization: Bearer` mechanism unchanged,
and is cheap relative to the security gained. The ticket's 30-second
TTL is intentionally tight — long enough to cover normal network
latency between issuance and handshake, short enough that a captured
URL is worthless well before a determined attacker could act on it.

## Future Implications

If `apps/server` moves to multiple processes, `ws_tickets` already
lives in PostgreSQL (unlike the in-memory rate limiter and
presence/broadcast registries), so ticket issuance and consumption
need no additional work to remain correct across instances — this was
a deliberate reason to back it with the database rather than an
in-memory map. No further action is anticipated unless a future
milestone wants WS reconnection without a round trip per attempt (e.g.
a longer-lived ticket with stricter single-connection binding), which
would be a new, explicit decision, not an incremental change to this
one.
