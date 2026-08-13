# Messaging — Access Control, Transport, and Encryption Status

**Status: Implemented — Milestone 1.0.**

Describes the security model implemented in
`apps/server/src/{domain,services,infrastructure,repositories,websocket}/messaging`.
See [ADR-0027](../adr/ADR-0027-messaging-friendship-gate-deviation.md)
(friendship-gating deviation), [ADR-0028](../adr/ADR-0028-messaging-websocket-architecture.md)
(WebSocket transport/presence/delivery), and
[ADR-0029](../adr/ADR-0029-message-encryption-deferred.md) (encryption
deferral) for the decision records.

## Encryption Status — Read This First

**Message content is stored in plaintext and is not end-to-end
encrypted.** This is a deliberate, documented deviation from the
canonical V1 product requirement, not an oversight — see
[ADR-0029](../adr/ADR-0029-message-encryption-deferred.md) for the
full reasoning. Transport security is TLS only (terminated at the
hosting platform); BlueMoon's own infrastructure, including anyone
with direct database access, can read message content. Do not treat
this system as end-to-end encrypted in any product or security
communication until a real E2EE design ships.

## Conversation Creation: Friendship-Gated

A conversation may only be created between two users with an existing
Social [Friendship](./Social.md) (Milestone 0.9) — there is no code
path that creates one from a username or any other identifier alone.
This is itself a deliberate interim deviation from the canonical
session/PIN model — see
[ADR-0027](../adr/ADR-0027-messaging-friendship-gate-deviation.md).
Enforced in `services/messaging/get-or-create-conversation.service.ts`
before any database write, and backed by the `conversations` table's
own uniqueness/check constraints (see
[Messaging-Schema.md](../database/Messaging-Schema.md)) as the
database-level backstop.

## Authorization: Membership, Checked on Every Access

Every read and write against a conversation or its messages verifies
the requesting user is one of its two participants
(`isParticipant`, `domain/messaging/entities/conversation.ts`):

- `GET /messaging/conversations/{id}/messages` — 404 if the
  conversation doesn't exist, 403 if the requester isn't a
  participant. Distinguished (unlike Social's anti-enumeration
  pattern) because a conversation id isn't a guessable secret the way
  a username or token is — a random UUID gives no meaningful
  enumeration surface.
- WebSocket `send_message` — the same `isParticipant` check runs
  before any write; a non-participant attempting to send into a
  conversation they're not part of gets a WS-level `error` event, and
  no message is persisted or broadcast.

## HTTP Authentication

Every Messaging HTTP endpoint requires an existing authenticated
session — Identity's `requireAuth` middleware, reused unmodified.
Messaging defines no authentication of its own; it presupposes the
caller is already logged in.

## WebSocket Authentication

The `/messaging/ws` connection is authenticated via a short-lived,
single-use **WS ticket** — never the long-lived access token, and
never a refresh token or credential/PIN. A browser cannot set custom
headers during a native WebSocket handshake, so _something_ has to
travel in the URL; a disposable ticket bounds that exposure the way a
bearer credential in the URL never could.

The flow: an already-authenticated caller (normal `Authorization:
Bearer` access token) calls `POST /auth/ws-ticket` over HTTPS. The
server generates a cryptographically random 32-byte value, stores only
its SHA-256 hash (`ws_tickets.ticket_hash`) alongside the issuing
user/session/device and a 30-second expiry, and returns the raw ticket
once in the response body — it is never persisted in raw form and
never logged. The client opens `/messaging/ws?ticket=<raw ticket>`. A
dedicated `requireWsAuth` middleware
(`middleware/identity/require-ws-auth.ts`) hashes the presented value
and atomically consumes the matching row — a single conditional
`UPDATE ... WHERE ticket_hash = $1 AND consumed_at IS NULL AND
expires_at > now() RETURNING *` — the same exactly-once-consumption
pattern already used for refresh-token rotation and BlueMoon Token
consumption. An invalid, expired, or already-consumed ticket rejects
the handshake with a generic HTTP-level 401 before any socket is ever
opened — there is no window where an unauthenticated client holds an
open connection, and under concurrent use of the same ticket exactly
one caller wins the race.

The ticket is scoped narrowly on purpose: it authenticates nothing but
the `/messaging/ws` upgrade, cannot be used against any other HTTP
endpoint, cannot replace the access/refresh token pair, and is not a
general-purpose authentication token — `infrastructure/identity/
ws-ticket.ts` is deliberately a separate module from `refresh-token.ts`
for the same reason `infrastructure/social/blue-moon-token.ts` is: this
is not authentication infrastructure and must not share a module with
it. See [ADR-0030](../adr/ADR-0030-websocket-ticket-authentication.md)
for the full design and the rejected alternatives (reusing the refresh
cookie, keeping the access token in the query string).

## Authorization Model for Real-Time Delivery

A WebSocket connection is per-user, not per-conversation: one
authenticated socket receives events for every conversation that user
is part of. Which conversations that is is computed server-side, at
message-persist time, directly from the `conversations` row's
participant columns — never from a client-declared subscription.
There is no WS-specific access-control surface separate from the same
`isParticipant` check HTTP uses.

## Delivery and Persistence Ordering

A message is written to PostgreSQL before it is broadcast to any
connected socket (`services/messaging/send-message.service.ts`).
Broadcast is best-effort and non-throwing; a recipient with no open
connection simply never receives the real-time push, but the message
is already durably persisted and retrievable via
`GET /messaging/conversations/{id}/messages` regardless. The database
is the single source of truth for message history — WebSocket
delivery is a convenience on top of it, never a replacement for it.

## Rate Limiting

Not currently applied to Messaging endpoints or the WebSocket
connection itself. Message-send volume is bounded only by the client;
this is a known, currently-unaddressed gap, tracked as a follow-up
rather than silently assumed to be covered by Identity's existing
per-IP limiters (which do not apply here).

## Presence

Online/offline only, computed at request time from whether a user has
at least one open WebSocket connection
(`infrastructure/messaging/presence-registry.ts`). No last-seen
timestamp, no heartbeat protocol, no read receipts, no typing
indicators — deliberately minimal, matching the task's explicit scope
and this codebase's privacy-by-default principle
([Architecture-Overview.md](../architecture/Architecture-Overview.md))
of not retaining metadata beyond what a feature actually requires.

## Audit

Not implemented for Messaging in this milestone — Identity and Social
both write to a shared `audit_events` table
([Authentication.md](./Authentication.md#audit-logging),
[Social.md](./Social.md#audit)); Messaging does not yet. Message
send/receive events are high-volume and privacy-sensitive in a way
that makes "audit every message" a real design decision (what
metadata, retained how long, for what purpose), not an obvious
extension of the existing pattern — deliberately left as an open
question rather than either silently added or silently assumed
unnecessary.
