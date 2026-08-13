# API

API documentation: endpoint reference, request/response contracts,
versioning strategy, and authentication.

Live, auto-generated OpenAPI reference for every HTTP endpoint is
served by the running server at `/openapi.json` (schema) and `/docs`
(Swagger UI) — see `apps/server/src/app.ts`. This file indexes what
exists and links to the relevant security/database docs for detail;
it does not duplicate the OpenAPI schema itself.

## Authentication (`/auth/*`)

See [Authentication.md](../security/Authentication.md) and
[Session-Management.md](../security/Session-Management.md).
`POST /auth/register`, `POST /auth/login`, `POST /auth/logout`,
`POST /auth/refresh`, `POST /auth/change-credential`,
`POST /auth/trust-device`, `DELETE /auth/trust-device/:id`,
`GET /auth/me`, `GET /auth/devices`, `POST /auth/ws-ticket` (issues a
short-lived, single-use ticket for the `/messaging/ws` handshake — see
[Messaging.md](../security/Messaging.md#websocket-authentication)).

## Social — BlueMoon Token & Friendship (`/social/*`)

See [Social.md](../security/Social.md). All routes require an
authenticated session (`requireAuth`).

`POST /social/blue-moon-tokens`, `POST /social/friendships`,
`GET /social/friendships`, `DELETE /social/friendships/{id}`.

## Messaging (`/messaging/*` and `/messaging/ws`)

See [Messaging.md](../security/Messaging.md) and
[Messaging-Schema.md](../database/Messaging-Schema.md). All routes and
the WebSocket connection require an authenticated session. Conversation
creation requires an existing Social Friendship with the target user —
see [ADR-0027](../adr/ADR-0027-messaging-friendship-gate-deviation.md).

### HTTP — reads and conversation creation

| Method | Path                                     | Purpose                                                                         |
| ------ | ---------------------------------------- | ------------------------------------------------------------------------------- |
| POST   | `/messaging/conversations`               | Get-or-create the conversation with `otherUserId` (must be a friend)            |
| GET    | `/messaging/conversations`               | List every conversation for the current user, with computed presence            |
| GET    | `/messaging/conversations/{id}/messages` | Newest-first, cursor-paginated message history (`limit`, `before` query params) |

There is no HTTP endpoint to send a message — see
[ADR-0028](../adr/ADR-0028-messaging-websocket-architecture.md) for
why real-time delivery is WebSocket-only.

### WebSocket — `GET /messaging/ws?ticket=<ws ticket>`

One connection per user (not per conversation); receives events for
every conversation that user is part of. Authenticated via a
short-lived, single-use ticket obtained from `POST /auth/ws-ticket` —
**not** the long-lived access token, which must never appear in a URL.
See [ADR-0028](../adr/ADR-0028-messaging-websocket-architecture.md)
for the transport design,
[ADR-0030](../adr/ADR-0030-websocket-ticket-authentication.md) for the
ticket authentication design, and
[Messaging.md](../security/Messaging.md#websocket-authentication) for
the full authentication model.

**Client → server events:**

```jsonc
{ "type": "send_message", "conversationId": "<uuid>", "content": "<text>" }
```

**Server → client events:**

```jsonc
// A new message in one of the connection's conversations
{ "type": "message", "data": { "id": "<uuid>", "conversationId": "<uuid>", "senderId": "<uuid|null>", "content": "<text>", "createdAt": "<ISO 8601>" } }

// The send_message event was invalid or rejected (bad shape, empty
// content, or the sender isn't a participant in that conversation)
{ "type": "error", "data": { "message": "<human-readable reason>" } }
```

A successful send is confirmed implicitly: the sender receives their
own `message` event back (broadcast goes to both participants, not
just the recipient), rather than a separate ack/error pair.
