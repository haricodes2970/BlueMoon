# ADR-0004: Hono for the Backend API

- **Date:** 2026-07-22
- **Status:** Accepted

## Context

The Session/Identity, Messaging/transport, and platform-edge boundaries
described in
[Architecture Overview](../architecture/Architecture-Overview.md) need
a backend API framework. It should be lightweight, run well on modern
deploy targets (edge/serverless-friendly, per ADR-0012 Railway), and not
impose heavy framework overhead for what is initially a small set of
services.

## Decision

Use Hono as the backend API framework.

## Alternatives Considered

- **Express:** rejected as primary choice — mature and familiar, but
  heavier and slower on modern edge/serverless runtimes than Hono;
  its middleware ecosystem is less relevant given a small, focused API
  surface.
- **Fastify:** a reasonable, performant alternative; Hono preferred for
  its smaller footprint and first-class multi-runtime support (Node,
  edge runtimes), which keeps deployment options open.
- **NestJS:** rejected — its opinionated, heavier architecture
  (decorators, DI container) is disproportionate to BlueMoon's current
  scale and conflicts with the "boring where it doesn't matter" principle
  in [Architecture Overview](../architecture/Architecture-Overview.md#design-philosophy).

## Consequences

- Backend stays lightweight and fast to iterate on while the API
  surface is small.
- Smaller ecosystem/plugin base than Express means some integrations may
  need to be hand-rolled.

## Tradeoffs

Trades ecosystem maturity/plugin breadth for runtime performance and
deployment flexibility. Acceptable given the API surface is currently
small and purpose-built rather than integration-heavy.

## Future Implications

If the backend later needs heavier framework features (complex DI,
large plugin ecosystem), revisit via a superseding ADR rather than
organically accumulating workarounds.
