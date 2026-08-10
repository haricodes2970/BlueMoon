# Phase 1.0 — 1:1 Messaging Vertical Slice (Interim, Friendship-Gated)

**Status: Complete** | **Dates:** 2026-08-10

## Purpose

Implement the smallest production-quality 1:1 messaging vertical
slice on top of Identity (Milestone 0.6–0.8) and Social (Milestone
0.9): persistent 1:1 conversations, text messages, message history,
real-time delivery, and basic presence.

**This is explicitly not the canonical PINChat V1 MVP described in
`docs/product/`.** Two genuine, material conflicts between the task
brief and the canonical product documentation were found and reported
before any implementation code was written (see Problems Found,
below); the founder made two explicit decisions to proceed as an
interim engineering milestone rather than block on a full redesign —
see [ADR-0027](../adr/ADR-0027-messaging-friendship-gate-deviation.md)
(friendship-gated, not session/PIN-gated) and
[ADR-0029](../adr/ADR-0029-message-encryption-deferred.md) (no E2EE
yet). Both deviations are deliberate, founder-approved, and documented
honestly — not silent scope changes.

## Goals

- Drizzle schema for `conversations` and `messages`, reusing the
  existing `users` table and Social's `friendships` (read-only) — no
  duplicate identity or relationship concept.
- Domain/application/infrastructure/repository/HTTP/WebSocket layers
  matching Identity's and Social's established conventions.
- Conversation creation gated on an existing Friendship, idempotent
  under concurrency, canonical-pair storage matching `friendships`.
- Authenticated real-time delivery over WebSocket, HTTP for history
  and conversation management — persist-then-broadcast, database
  remains the source of truth regardless of recipient connection
  state.
- Basic online/offline presence, read at request time.
- Minimal PINChat frontend: login/register, friend list → start
  conversation, conversation list, active conversation view with
  history, composer, sending state, and presence indicator.
- `pnpm test` stays database-free; new real-Postgres and real-WebSocket
  coverage is opt-in via `pnpm test:db`, exactly as Milestones 0.8/0.9
  established.

## Tasks

- [x] `conversations`, `messages` Drizzle schema + migration, verified
      against a fresh PostgreSQL instance
- [x] Domain: entities, errors, message-content value object
      (`domain/messaging/`)
- [x] Infrastructure: in-memory `PresenceRegistry` +
      `MessageBroadcaster` (`infrastructure/messaging/`)
- [x] Repositories: `ConversationRepository` (atomic
      `findOrCreateForUsers`), `MessageRepository` (cursor-paginated
      history) (`repositories/messaging/`)
- [x] Application services + Zod validation schemas
      (`services/messaging/`, `validation/messaging/`)
- [x] `messaging-container.ts` composition root; `app.ts` mounts
      `/messaging/*` HTTP routes and the `/messaging/ws` WebSocket
      route
- [x] `@hono/node-server` bumped to `2.1.0` for native
      `upgradeWebSocket`; `ws` added for the underlying
      `WebSocketServer`
- [x] `requireWsAuth` middleware (query-string access token) +
      authenticated WebSocket connection lifecycle
      (`websocket/messaging/connection.ts`)
- [x] CORS enabled (`hono/cors`, `WEB_ORIGIN` env var) — required for
      `apps/web` to call the API cross-origin; did not exist before
      this milestone since nothing had called the API from a browser
      yet
- [x] Fake-container HTTP tests (10) + fake-container WebSocket tests
      (9, using a real listening TCP server + real `ws` client against
      in-memory containers) — `pnpm test` stays database-free
- [x] Real-Postgres repository tests (13) + HTTP tests (5) + WebSocket
      tests (2) — `pnpm test:db`
- [x] Minimal Next.js frontend: auth store, API client, WS hook,
      login/register pages, conversation sidebar, active-conversation
      view with history/composer/presence, loading/error/empty states
- [x] ADR-0027 (friendship-gate deviation), ADR-0028 (WebSocket
      architecture), ADR-0029 (E2EE deferral)
- [x] Full quality gate green; golden path verified end-to-end in a
      real browser against a real server and a real PostgreSQL
      instance (two accounts, friendship, conversation creation,
      bidirectional real-time delivery, persisted history, live
      presence)
- [x] Docs: this document, `docs/database/Messaging-Schema.md`,
      `docs/security/Messaging.md`, `docs/api/README.md`, `CLAUDE.md`,
      `ROADMAP.md`, `TODO.md`, `CHANGELOG.md`, Engineering Journal,
      PRD status note

## Completed Work

**Schema** (`packages/database/src/schema/{conversations,messages}.ts`):
`conversations` (undirected pair, canonical storage order enforced by
a check constraint, unique on the pair, both participant FKs cascade)
and `messages` (`sender_id` is `ON DELETE SET NULL`, not cascade —
attribution, not ownership, matching `audit_events`/
`blue_moon_tokens.consumed_by_user_id`'s existing precedent; a
composite `(conversation_id, created_at)` index supports newest-first
paginated history). Migration `0002_far_elektra.sql` applied cleanly
to a fresh PostgreSQL instance; every table, FK, constraint, and index
confirmed present via `psql`. See
[Messaging-Schema.md](../database/Messaging-Schema.md).

**Domain** (`apps/server/src/domain/messaging/`): `Conversation` and
`Message` entities with `canonicalizePair`/`otherParticipant`/
`isParticipant` helpers (mirroring `domain/social/entities/friendship.ts`);
`MessageContent` value object (non-empty after trim, 4000-character
cap); typed errors (`ConversationNotFoundError`,
`ConversationForbiddenError`, `NotFriendsError`,
`CannotMessageSelfError`).

**Infrastructure** (`apps/server/src/infrastructure/messaging/`):
`PresenceRegistry` (in-memory `Map<userId, Set<socket>>`, tracking
multiple connections per user for multi-tab/device support) and
`MessageBroadcaster` (event-shape-agnostic fan-out to a user's
connections, best-effort/non-throwing) — both single-process, same
documented limitation as `infrastructure/identity/rate-limiter.ts`.

**Repositories** (`apps/server/src/repositories/messaging/`):
`ConversationRepository.findOrCreateForUsers` uses the same
`INSERT ... ON CONFLICT DO NOTHING` + fallback `SELECT` technique as
Social's token-consumption flow, but for the opposite concurrency
reason — every concurrent caller should succeed with the identical
row, not race to be the sole winner. `MessageRepository.listForConversation`
supports newest-first cursor pagination via a `before` timestamp.

**Application services** (`apps/server/src/services/messaging/`):
`getOrCreateConversation` (friendship-gated, self-conversation
rejected, idempotent), `listConversations` (resolves the other
participant + live presence per conversation), `listMessages`
(membership-checked history read), `sendMessage` (membership-checked,
content-validated, persist-then-broadcast to both participants).

**Composition root and app wiring**: `apps/server/src/messaging-container.ts`
mirrors `container.ts`/`social-container.ts`'s shape, reusing
Identity's `UserRepository` and a new, read-only instance of Social's
`FriendshipRepository` (constructed directly here, not by widening
`SocialContainer`'s public interface). `app.ts` mounts `/messaging/*`
HTTP routes and registers the `/messaging/ws` route
(`requireWsAuth` + `upgradeWebSocket`) behind the same shared
`Database` instance Identity and Social already use, plus a new
`cors()` middleware (`WEB_ORIGIN` env var) required for `apps/web` to
call the API cross-origin.

**HTTP** (`routes/messaging/`, `controllers/messaging/`):
`POST /messaging/conversations`, `GET /messaging/conversations`,
`GET /messaging/conversations/{id}/messages` — all behind Identity's
unmodified `requireAuth`. No `POST` to send a message; see
[ADR-0028](../adr/ADR-0028-messaging-websocket-architecture.md).

**WebSocket** (`websocket/messaging/connection.ts`,
`middleware/identity/require-ws-auth.ts`): `@hono/node-server` bumped
1.13.7 → 2.1.0 for its native `upgradeWebSocket` export (the installed
1.x version has no WebSocket support at all — confirmed by inspecting
its type declarations directly before deciding to bump rather than use
the deprecated `@hono/node-ws`). `requireWsAuth` authenticates via
`?access_token=` query parameter (not the `Authorization` header,
which browsers cannot set during a WS handshake) using the identical
`AccessTokenService` HTTP uses; a rejected handshake never opens a
socket. One connection per user delivers events for every conversation
they're part of — authorization computed server-side from row data,
never a client-declared subscription. `send_message` is the only
inbound event; `message`/`error` are the only outbound events. See
[ADR-0028](../adr/ADR-0028-messaging-websocket-architecture.md) and
[docs/api/README.md](../api/README.md#websocket--get-messagingwsaccess_tokentoken)
for the full event contract.

**Frontend** (`apps/web/src/`): Zustand `useAuthStore`
(localStorage-persisted access token, with an explicit
`hasHydrated` flag — persist's rehydration is asynchronous, and a
naive redirect-if-no-token check on mount would bounce an
already-logged-in user back to `/login` on every page load; found and
fixed during browser verification, see Problems Found). `lib/api-client.ts`
(typed fetch wrapper), `hooks/use-messaging-socket.ts` (WS connection
with auto-reconnect). Pages: `/login`, `/register`,
`/chat` (layout with conversation sidebar + auth guard),
`/chat/[conversationId]` (message history via TanStack Query, WS-driven
live updates merged into the query cache, composer with a sending
indicator, presence dot). No new design system — one additional
hand-added shadcn/ui primitive (`Input`), same convention as the
existing `Button`.

**Testing**: 10 fake-container HTTP tests
(`conversations.routes.test.ts`) covering authenticated creation, the
friendship gate, self-conversation rejection, idempotent and
concurrent creation, listing, and message-history authorization. 9
fake-container WebSocket tests (`connection.test.ts`) — a new test
harness (`test-utils/ws-test-server.ts`) starts a real listening TCP
server via `serve({websocket})` against in-memory fake containers,
using a real `ws` client, since WS needs an actual HTTP upgrade that
`app.request()` cannot exercise. Covers authenticated/unauthenticated
connection, real-time delivery, delivery to a disconnected recipient
(persisted regardless), non-member rejection, empty-content rejection,
multi-device sync (broadcast to a sender's own other connections), and
presence transitioning on connect/disconnect. `pnpm test` stays
database-free at 53/53 (34 Identity/Social + 10 Messaging HTTP + 9
Messaging WS). 13 real-Postgres repository tests
(`messaging-repositories.integration.test.ts`, including concurrent
`findOrCreateForUsers` and both cascade behaviors) + 5 real-Postgres
HTTP tests + 2 real-Postgres WebSocket tests (delivery and
disconnected-recipient persistence, against a real server and a real
database) — `pnpm test:db` at 59/59 total.

**Browser verification**: with a real server (real PostgreSQL,
`docker compose up -d postgres`) and a real `next start` build, two
accounts were registered, befriended via the existing Social HTTP
flow, and used to drive the full golden path through the actual UI —
friend list → start conversation → real-time bidirectional message
delivery (confirmed live in each browser tab without a reload) →
persisted history on reload → live online/offline presence reflecting
actual WebSocket connection state. See Problems Found for a real
frontend bug (#3) and a real testing-process issue (#5) this surfaced
and resolved before being considered complete.

## Files Created

`packages/database/src/schema/{conversations,messages}.ts`,
`packages/database/migrations/0002_far_elektra.sql`,
`apps/server/src/domain/messaging/{entities/conversation,entities/message,errors,value-objects/message-content}.ts`,
`apps/server/src/infrastructure/messaging/{presence-registry,broadcaster}.ts`,
`apps/server/src/repositories/messaging/{conversation,message}.repository.ts`,
`apps/server/src/services/messaging/{dto,get-or-create-conversation,list-conversations,list-messages,send-message}.service.ts`,
`apps/server/src/validation/messaging/{get-or-create-conversation,list-messages,send-message}.schema.ts`,
`apps/server/src/routes/messaging/{conversations.routes,index}.ts`,
`apps/server/src/controllers/messaging/conversations.controller.ts`,
`apps/server/src/websocket/messaging/connection.ts`,
`apps/server/src/middleware/identity/require-ws-auth.ts`,
`apps/server/src/messaging-container.ts`,
`apps/server/src/test-utils/{fake-messaging-container,ws-test-server}.ts`,
`apps/server/src/routes/messaging/conversations.routes.test.ts`,
`apps/server/src/websocket/messaging/connection.test.ts`,
`apps/server/src/repositories/messaging/messaging-repositories.integration.test.ts`,
`apps/server/src/routes/messaging/conversations.routes.integration.test.ts`,
`apps/server/src/websocket/messaging/connection.integration.test.ts`,
`apps/web/src/lib/{api-client,device}.ts`,
`apps/web/src/store/auth-store.ts`,
`apps/web/src/hooks/use-messaging-socket.ts`,
`apps/web/src/components/auth/auth-form.tsx`,
`apps/web/src/components/messaging/{conversation-sidebar,presence-dot,message-list,message-composer}.tsx`,
`apps/web/src/components/ui/input.tsx`,
`apps/web/src/app/login/page.tsx`, `apps/web/src/app/register/page.tsx`,
`apps/web/src/app/chat/{layout,page}.tsx`,
`apps/web/src/app/chat/[conversationId]/page.tsx`,
`docs/adr/ADR-0027-messaging-friendship-gate-deviation.md`,
`docs/adr/ADR-0028-messaging-websocket-architecture.md`,
`docs/adr/ADR-0029-message-encryption-deferred.md`,
`docs/database/Messaging-Schema.md`, `docs/security/Messaging.md`,
`docs/phases/Phase-1.0.md` (this document).

## Files Modified

`packages/database/src/schema/index.ts` (additive exports),
`apps/server/package.json` (`@hono/node-server` bumped to `^2.1.0`,
`ws`/`@types/ws` added), `apps/server/src/app.ts` (mounts Messaging
HTTP + WS routes, adds `cors()` middleware, extends
`CreateAppOptions`), `apps/server/src/index.ts` (constructs
`WebSocketServer({noServer:true})`, passes it to `serve({websocket})`),
`apps/server/src/env.ts` (`WEB_ORIGIN`), `apps/server/.env.example`,
`apps/server/src/test-utils/real-db.ts` (`resetAllTables` now also
truncates `conversations`/`messages`), `apps/server/src/test-utils/fake-social-container.ts`
(additively exposes its internal `FriendshipRepository` so the
Messaging fake container can share the same friendship data in
cross-context HTTP tests), `apps/web/package.json` (no dependency
changes — `zustand`/`@tanstack/react-query` were already present),
`docs/api/README.md` (populated from an empty placeholder), `DECISIONS.md`,
`CLAUDE.md`, `ROADMAP.md`, `TODO.md`, `CHANGELOG.md`,
`docs/engineering/Engineering-Journal.md`,
`docs/product/Product-Requirements-Document.md` (status note only —
see Files Modified reasoning in the Problems Solved section below).

## Architecture Decisions

ADR-0027 (friendship-gated messaging, an interim, founder-approved
deviation from the canonical session/PIN model), ADR-0028 (WebSocket
transport: query-string auth, per-user connections, persist-then-
broadcast, in-memory single-process presence/delivery), ADR-0029
(end-to-end encryption deferred; plaintext storage, TLS transport
only, honestly documented rather than faked or silently dropped).

## Problems Found

1. **Real, material product-documentation conflict, not an
   implementation detail** — the task's friendship-gated messaging
   framing directly contradicts `ROADMAP.md`'s session/PIN Milestone
   1.0 checklist and `Architecture-Overview.md`'s "identity is
   additive, never a precondition" principle. Found during Phase 1
   inspection, before any implementation code was written, and
   reported per the Product Documentation Policy rather than resolved
   silently.
2. **Real, material product-documentation conflict, encryption** — the
   product blueprint and `ROADMAP.md` both list E2EE as required V1
   scope; no encryption design existed anywhere in the codebase. Found
   and reported alongside #1, before implementation began.
3. **Real bug, found during browser verification (Zustand persist
   rehydration race):** `zustand/middleware`'s `persist` hydrates from
   `localStorage` asynchronously. `app/chat/layout.tsx`'s original
   auth guard checked `accessToken` on mount and redirected to
   `/login` if absent — on a fresh page load, this fired before
   hydration completed, so an already-logged-in user reloading `/chat`
   directly was briefly bounced to the login page every time.
4. **Initially suspected bug, disproven on investigation:** during
   manual browser testing, registration attempts intermittently
   returned 429 (rate limited) after only a handful of tries, and it
   was initially suspected that `/auth/register`'s rate-limit
   middleware (`app.use("/auth/register", rateLimit(...))`) was
   double-counting CORS preflight `OPTIONS` requests against the same
   5/hour quota as real registrations. Traced to root cause instead of
   assumed: it wasn't that. Hono's `cors()` middleware, registered
   globally before any route, short-circuits every `OPTIONS` request
   with its own 204 response and never calls `next()` — confirmed by
   sending 8 consecutive preflight `OPTIONS` requests followed by a
   real `POST`, all against a freshly restarted server, and observing
   the `POST` still succeed (201). The actual cause was #5, below.
5. **Real testing-process issue, root cause of #4's symptom:** a
   long-lived, stale server process from earlier in this session's
   manual testing (started before `WEB_ORIGIN`/`cors()` existed, and
   before the JWT secret used in later runs) kept running and serving
   requests on port 8787 after later `node apps/server/dist/index.js &`
   invocations silently failed to bind (`EADDRINUSE`) and were never
   checked for success. Every subsequent "restart" was actually still
   hitting the same old process with the old build and no CORS
   support, which explained both the apparent CORS failures and the
   apparent rate-limit exhaustion (real registration attempts across
   many manual test runs, all against one never-actually-restarted
   process, legitimately accumulated against its one in-memory quota).
   Resolved by explicitly checking `ps`/`ss -ltnp` before trusting that
   a background-started server had actually taken over the port.

## Problems Solved

1. Reported to the founder with exact document citations via
   `AskUserQuestion` rather than resolved unilaterally; the founder
   chose "friendship-gated now, session/PIN later" explicitly,
   recorded in [ADR-0027](../adr/ADR-0027-messaging-friendship-gate-deviation.md).
2. Reported alongside #1; the founder chose "defer E2EE, document the
   gap honestly," recorded in
   [ADR-0029](../adr/ADR-0029-message-encryption-deferred.md) — no
   fake or partial cryptography was implemented.
3. Fixed by adding an explicit `hasHydrated` flag to `useAuthStore`
   (set via `persist`'s `onRehydrateStorage` callback) and gating the
   layout's redirect decision on it: `if (hasHydrated && !accessToken)
redirect()`. Verified by reloading an authenticated session
   directly on `/chat` and confirming it no longer bounces to
   `/login`.
4. No code fix needed — `WEB_ORIGIN` env var and `hono/cors`
   middleware (`apps/server/src/{env,app}.ts`) were already correct;
   `cors()`'s built-in preflight short-circuit means `OPTIONS` never
   reaches the rate limiter. Confirmed empirically (8 consecutive
   preflight requests, then a real registration, against a freshly
   restarted process, all succeeding) rather than assumed from reading
   the middleware order alone.
5. Fixed by killing the actual stale process (identified via `ps aux`
   / `ss -ltnp`, not assumed from the most recent shell command's exit
   code) and confirming the new process was the one bound to the port
   before re-testing; not a code change, a testing-discipline note for
   future manual verification passes involving backgrounded servers.

## Quality Gate Results

`pnpm install`, `pnpm build`, `pnpm lint`, `pnpm type-check`,
`pnpm format:check` — all pass. `pnpm test`: 53/53 (34 Identity/Social

- 10 Messaging HTTP + 9 Messaging WebSocket), no database. `pnpm
test:db` (fresh disposable Postgres, migrations reapplied): 59/59 (39
  Identity/Social + 13 Messaging repository + 5 Messaging HTTP + 2
  Messaging WebSocket). Full golden path additionally verified live in
  a real browser (`next build` + `next start`) against a real server
  (`tsc` build + `node dist/index.js`) and a real disposable PostgreSQL
  instance — see Completed Work, Frontend/Browser verification.

## Lessons Learned

The atomic `INSERT ... ON CONFLICT DO NOTHING` + fallback `SELECT`
pattern Milestone 0.9 established generalizes cleanly to an opposite
concurrency intent (idempotent multi-winner instead of single-winner)
without needing a different technique — the SQL shape is identical;
only the meaning of "conflict" at the call site differs. Zustand's
`persist` middleware being asynchronous is easy to miss until tested
against a real page load (not just client-side navigation within an
already-hydrated SPA session) — worth remembering for any future
client-side auth-gated route. Manually verifying a full-stack feature
in a real browser, against real background server processes, surfaces
a real category of bug (CORS, rate-limit interactions, hydration
races) that no unit, integration, or fake-container test in this
codebase would have caught, because none of them exercise a real
browser's fetch/WebSocket/localStorage behavior end-to-end.

## Remaining Gaps

- **No rate limiting on Messaging** (`docs/security/Messaging.md`) —
  message-send volume is currently bounded only by the client.
- **No E2EE** — see [ADR-0029](../adr/ADR-0029-message-encryption-deferred.md).
  This remains a real gap against the canonical V1 product
  specification, not resolved by this milestone.
- **Friendship-gated, not session/PIN-gated** — see
  [ADR-0027](../adr/ADR-0027-messaging-friendship-gate-deviation.md).
  The canonical PINChat V1 session/PIN model remains entirely
  unimplemented.
- **No message editing or deletion** — not implemented, and not
  determined to be required for this milestone's scope; the task
  brief's own instruction was to avoid implementing features not
  explicitly required.
- **Presence is poll-based on the frontend** (5-second refetch
  interval), not push-based — see
  [ADR-0028](../adr/ADR-0028-messaging-websocket-architecture.md)'s
  Tradeoffs section.
- **No domain-layer unit tests** — same pre-existing gap flagged since
  Milestone 0.7 for Identity, now also true of Messaging's domain
  layer (`MessageContent`, `canonicalizePair`, etc. are covered
  indirectly through HTTP/repository tests, not directly).

## Next Phase

The real PINChat V1 session/PIN model, per the canonical product
documentation, remains entirely unimplemented and unscheduled — see
[ADR-0027](../adr/ADR-0027-messaging-friendship-gate-deviation.md)'s
Future Implications for the open architectural question it raises.
Not started as part of this phase, per the founder's explicit interim
scoping decision.
