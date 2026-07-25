# ADR-0020: Centralized Logging with pino

- **Date:** 2026-07-25
- **Status:** Accepted

## Context

Milestone 0.5 requires a centralized logger shared across every app:
structured logs, log levels, request-ID correlation, and different
formatting for development vs. production. Per
[coding-standards.md](../engineering/coding-standards.md#logging),
logging must never be bare `console.log`, and must never leak
secrets/tokens/message content.

## Decision

Use [pino](https://getpino.io) as the logging library, wrapped by a
single `createLogger()` factory in `packages/utils` (`src/logger.ts`),
consumed by every app. `pino-pretty` provides development formatting;
production/test emit structured JSON directly (pino's native format).
A `withRequestId()` helper returns a child logger scoped to a single
request for correlation.

## Alternatives Considered

- **winston:** a common alternative; rejected — pino is meaningfully
  faster (lower per-call overhead), which matters for a real-time
  messaging backend, and its structured-JSON-by-default output needs
  no extra configuration to be production-ready.
- **Bare `console.log`/`console.error`:** rejected outright — no log
  levels, no structured fields, no request correlation, and explicitly
  disallowed by [coding-standards.md](../engineering/coding-standards.md#logging).
- **Per-app custom logger instances (no shared factory):** rejected —
  would let format/level conventions drift between `apps/web` and
  `apps/server`, and duplicates effort every time a new app is added.
  A single factory in `packages/utils` is the reuse mechanism, per
  [Package-Architecture.md](../architecture/Package-Architecture.md#packagesutils).

## Consequences

- Every app gets structured JSON logs in production/test (log
  aggregation-ready) and readable pretty-printed logs in development,
  from the same `createLogger()` call, differing only by `environment`.
- `apps/server`'s request-context middleware assigns/propagates an
  `x-request-id` and scopes a child logger to it, so every log line for
  a request can be correlated without manual plumbing per route.
- Adds a runtime dependency on `pino`/`pino-pretty` to every app that
  logs (currently `apps/server`; `apps/web` doesn't use it yet since
  client-side logging isn't part of this milestone).

## Tradeoffs

pino's performance-first design trades some ergonomics (its API is
slightly less friendly than winston's for ad hoc debugging output) for
lower overhead in the hot path — acceptable since structured logging is
meant for machine consumption (log aggregation), not primarily for
being read raw in a terminal outside development.

## Future Implications

Client-side (browser) logging for `apps/web` is not addressed by this
ADR — pino is a Node-oriented library; a browser-side logging strategy
(if needed) is a separate future decision. Log aggregation/shipping
(e.g. to a hosted log service) is also not addressed here — this ADR
covers the logging library only, not where logs end up in production.
