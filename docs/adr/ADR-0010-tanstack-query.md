# ADR-0010: TanStack Query for Server State

- **Date:** 2026-07-22
- **Status:** Accepted

## Context

The client needs to fetch, cache, and synchronize server data (session
info, contact lists, message history) from the Hono API (ADR-0004),
with predictable caching, refetching, and loading/error state handling.

## Decision

Use TanStack Query for server-state data fetching and caching on the
client.

## Alternatives Considered

- **Hand-rolled fetch + useEffect:** rejected — reinvents caching,
  deduplication, and stale-data handling that TanStack Query already
  solves; error-prone at scale.
- **SWR:** a reasonable, similar alternative; TanStack Query preferred
  for its more complete mutation handling and broader ecosystem fit with
  Next.js/React.
- **Apollo Client:** rejected — assumes a GraphQL API; the backend
  (Hono, ADR-0004) is not committed to GraphQL, and Apollo's client
  cache model is heavier than needed here.

## Consequences

- Consistent, well-tested caching/loading/error handling for all
  server-derived data instead of ad hoc per-component logic.
- Clear boundary with Zustand (ADR-0009): TanStack Query owns anything
  that originates from the server; Zustand owns local-only UI state.

## Tradeoffs

Adds a dependency and a caching model contributors need to learn, in
exchange for eliminating a large class of manual data-fetching bugs.

## Future Implications

If real-time (websocket/streaming) data becomes the dominant data
pattern for session messaging, evaluate how TanStack Query's cache
integrates with that transport — likely via manual cache updates from
socket events, to be documented when the messaging transport is
designed.
