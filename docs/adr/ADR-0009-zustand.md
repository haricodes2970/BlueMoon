# ADR-0009: Zustand for Client State Management

- **Date:** 2026-07-22
- **Status:** Accepted

## Context

The client needs local/UI state management for things that are not
server data (active session UI state, draft message input, local
ephemeral flags) distinct from server-cache state, which is handled
separately (see ADR-0010, TanStack Query).

## Decision

Use Zustand for client-side (non-server) state management.

## Alternatives Considered

- **Redux/Redux Toolkit:** rejected — significantly more boilerplate
  and ceremony than the app's state needs justify; conflicts with
  "boring where it doesn't matter" from
  [Architecture Overview](../architecture/Architecture-Overview.md#design-philosophy).
- **React Context alone:** rejected as the sole mechanism — fine for
  narrow cases but does not scale cleanly to frequently-updating
  real-time session state without performance workarounds.
- **Jotai / Recoil:** reasonable alternatives; Zustand preferred for its
  minimal API surface and lack of required provider wrapping.

## Consequences

- Small, explicit stores for session/UI state with minimal boilerplate.
- Clear separation of concerns: Zustand for client state, TanStack Query
  for server state (ADR-0010) — these should not be blurred.

## Tradeoffs

Less structure/convention enforcement than Redux Toolkit provides out of
the box; requires team discipline to keep stores small and scoped
rather than growing into a single global blob.

## Future Implications

If client state complexity grows substantially (e.g. complex offline
sync), revisit whether a more structured state layer is warranted.
