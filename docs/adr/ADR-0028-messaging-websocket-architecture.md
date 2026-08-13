# ADR-0028: WebSocket Transport, Presence, and Delivery Model for Messaging

- **Date:** 2026-08-10
- **Status:** Accepted (authentication sub-decision superseded by
  [ADR-0030](./ADR-0030-websocket-ticket-authentication.md) — see below)

> **2026-08-13 amendment:** the "Authentication" decision below
> (long-lived access token in the `?access_token=` query string) was
> replaced by a short-lived, single-use WS ticket — see
> [ADR-0030](./ADR-0030-websocket-ticket-authentication.md). Every
> other decision in this ADR (library choice, per-user connections,
> persist-then-broadcast, in-memory presence/broadcast) is unchanged.

## Context

Milestone 1.0 requires real-time message delivery and basic
online/offline presence on top of the persistent `conversations`/
`messages` schema, per `docs/architecture/Backend-Architecture.md`'s
anticipated `websocket/` layer ("a second transport, not a second
business-logic layer"). Several implementation questions needed
explicit decisions: which WebSocket library, how a WS connection
authenticates, whether delivery is per-conversation or per-user,
whether persistence and broadcast are ordered, and whether presence
needs anything beyond a simple online/offline flag.

## Decision

**Library: bump `@hono/node-server` to `2.1.0` for its native
`upgradeWebSocket` export, backed by the `ws` package.** The installed
`1.13.7`-range version has no WebSocket support at all (confirmed by
inspecting its type declarations directly); `2.1.0` exports
`upgradeWebSocket` from its root, requires a `WebSocketServer({
noServer: true })` instance passed to `serve({websocket: {server}})`,
and has a `hono: ^4` peer dependency compatible with the installed
`hono@4.12.31`. This avoids the deprecated `@hono/node-ws` package.
Verified via direct package inspection (`npm pack`) and current
`hono.dev` documentation before adopting.

**Authentication: access token via query string
(`?access_token=`), not the `Authorization` header.** Browsers cannot
set custom headers during a native WebSocket handshake. A new
`requireWsAuth` middleware (`middleware/identity/require-ws-auth.ts`)
mirrors `requireAuth` exactly — same `AccessTokenService`, same
generic-failure behavior — reading the token from
`c.req.query("access_token")` instead. It is mounted as ordinary Hono
middleware immediately before `upgradeWebSocket(...)` on the
`/messaging/ws` route; a thrown `UnauthorizedError` is caught by the
existing global error handler before the upgrade happens, so an
unauthenticated client gets a rejected HTTP-level handshake (never an
open, unauthenticated socket).

**Per-user connections, not per-conversation.** One authenticated
WebSocket receives events for every conversation that user is part of.
Authorization for broadcast is computed server-side, from the
`conversations` row's own participant columns, at persist/broadcast
time — never from a client-declared subscription. This avoids a
stateful subscribe/unsubscribe protocol entirely: "am I allowed to see
this event" is answered the same way HTTP already answers it
(`isParticipant`), not by a separate WS-specific access-control layer.

**HTTP for reads and conversation creation; WebSocket for writes.**
There is no `POST` endpoint to send a message — only the WS
`send_message` event does. This follows directly from the task's own
architecture split: real-time delivery is a WebSocket concern; message
history is an HTTP concern. `GET /messaging/conversations/{id}/messages`
serves history regardless of whether the requester's WS connection
recently missed anything.

**Persist-then-broadcast, not persist-or-broadcast.**
`send-message.service.ts` writes to PostgreSQL first; broadcasting to
connected sockets (`MessageBroadcaster.sendToUser`) is a best-effort,
non-throwing side effect afterward, sent to both conversation
participants' current connections (so a sender with multiple open
tabs/devices sees the message too). If the recipient is offline, the
message still exists — verified directly by a test that sends a
message with the recipient's socket never connected, then confirms it
via `GET` history. The database remains the single source of truth
regardless of WebSocket delivery outcome.

**In-memory, single-process presence and broadcast — no message
queue, no Redis.** `PresenceRegistry` (`Map<userId, Set<socket>>`) and
`MessageBroadcaster` are both plain in-memory implementations,
following the exact precedent already set by
`infrastructure/identity/rate-limiter.ts`: correct for a single
process, with the same documented horizontal-scaling limitation. No
message queue or pub/sub system is introduced — nothing in this
milestone's actual load or architecture requires one yet.

**Presence: online/offline only, read at request time.** `isOnline`
is a simple "does this user have at least one open connection right
now" check; there is no last-seen timestamp, no heartbeat protocol,
and no push-based presence-change event. The HTTP conversation-list
and conversation-create responses include a computed `online` field;
the frontend re-polls periodically (5s) to keep it roughly current.
This is the minimum presence model that satisfies "basic
online/offline" without inventing new metadata retention the product
principles don't call for.

## Alternatives Considered

- **Per-conversation subscribe/unsubscribe WS protocol:** rejected —
  adds a stateful client-driven authorization surface for no benefit
  over the simpler "one connection, server-computed fan-out" model at
  this milestone's scale.
- **HTTP endpoint for sending messages too (in addition to WS):**
  rejected — the task's own architecture split assigns real-time
  delivery exclusively to WebSocket; a redundant HTTP path would be
  unused surface area.
- **Push-based presence events (broadcast "user X went online" to
  their friends):** rejected for this milestone — requires the WS
  layer to know a user's full friend/conversation graph on every
  connect/disconnect, meaningfully more complexity than the
  read-at-request-time model, for a feature explicitly scoped as
  "basic" presence.
- **Redis-backed presence/broadcast:** rejected — no current
  deployment requirement forces multi-process delivery; adding it now
  would be infrastructure speculation, not a response to an actual
  need, and would contradict `docs/architecture/Architecture-Overview.md`'s
  "boring where it doesn't matter" principle.

## Consequences

- `apps/server/src/index.ts` now constructs a `WebSocketServer({
noServer: true })` and passes it to `serve({websocket: {server}})`
  — production startup has one additional piece of wiring beyond
  Milestone 0.9's plain `serve({fetch})`.
- WS message handlers must catch and format `AppError`s manually
  (`websocket/messaging/connection.ts`) — `middleware/error-handler.ts`
  only applies to the HTTP request/response cycle, not to WS message
  events after the initial upgrade.
- A new test harness (`test-utils/ws-test-server.ts`) is required
  beyond the existing `app.request()` fetch-based helper, since WS
  needs a real listening TCP server. Used by both the database-free
  fake-container WS tests and the real-Postgres WS integration tests.

## Tradeoffs

Single-process presence/broadcast means a horizontally-scaled
deployment would need to move to a shared store before this holds —
the identical, already-accepted tradeoff as the rate limiter. Read-at-
request-time presence (rather than push-based) means a peer's
online/offline indicator can be up to 5 seconds stale in the frontend
— accepted as adequate for "basic" presence, not real-time-accurate
presence.

## Future Implications

If a future milestone needs horizontal scaling of `apps/server`, both
`PresenceRegistry` and `MessageBroadcaster` need a shared backing store
(Redis pub/sub is the natural fit) before multiple processes can
correctly deliver to a user connected to a different instance — same
follow-up already tracked for the rate limiter. If presence needs to
become push-based (e.g. for a future "recent activity" feature), it
would need the WS layer to resolve a user's conversation graph on
connect, a real design change, not an incremental addition to the
current model.
