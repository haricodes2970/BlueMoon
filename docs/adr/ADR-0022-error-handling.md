# ADR-0022: Typed Error Classes with Centralized HTTP Mapping

- **Date:** 2026-07-25
- **Status:** Accepted

## Context

Per [coding-standards.md](../engineering/coding-standards.md#error-handling),
errors must be typed/discriminated (not generic `Error` with a parsed
string message), and the boundary that converts internal errors into
HTTP responses belongs at the controller/middleware layer, not scattered
through business logic. Milestone 0.5 requires standard error classes,
API error response shapes, an unknown-error handler, and validation
error mapping.

## Decision

- `packages/utils` (`src/errors.ts`) defines an `AppError` base class
  carrying a typed `ErrorCode` (`packages/types`) and an HTTP status
  code, plus subclasses for the common cases: `ValidationError`,
  `NotFoundError`, `UnauthorizedError`, `ForbiddenError`,
  `ConflictError`.
- `packages/types` (`src/error.ts`) defines the wire shape:
  `ApiErrorResponse` / `ApiErrorBody`, keyed by the same `ErrorCode`
  union.
- `apps/server`'s single central error handler
  (`src/middleware/error-handler.ts`, registered via Hono's
  `app.onError`) maps `ZodError` → `400` with per-field details,
  `AppError` subclasses → their carried status code, and anything else
  → a logged `500` with a generic message — the client never sees a
  raw internal error message for unexpected failures.

## Alternatives Considered

- **Generic `Error` with string messages, matched by substring at the
  call site:** rejected — exactly what
  [coding-standards.md](../engineering/coding-standards.md#error-handling)
  prohibits; string-matching is fragile and doesn't scale as error
  cases grow.
- **Per-route try/catch with ad hoc response shaping:** rejected — a
  route-by-route handler was guaranteed to drift (some routes forget to
  handle a case, response shapes diverge). A single `onError` handler
  guarantees every unhandled path gets the same treatment.
- **A generic-purpose error library (e.g. `http-errors`):** rejected —
  doesn't integrate with our typed `ErrorCode` union or
  `ApiErrorResponse` shape from `packages/types`; a thin in-house class
  hierarchy is simpler and keeps the error code vocabulary centralized
  and intentional rather than borrowing an arbitrary status-code-named
  API.

## Consequences

- Any code that needs to signal a specific failure throws the matching
  `AppError` subclass; the error handler is the only place that knows
  how to turn that into an HTTP response, satisfying the
  "controllers/route handlers are the boundary" rule.
- Every error response has a consistent shape (`{ success: false,
error: { code, message, details?, requestId } }`), making client-side
  error handling uniform regardless of which endpoint failed.
- Unexpected (non-`AppError`, non-`ZodError`) errors are always logged
  with full detail server-side but never leak their message to the
  client — reduces risk of accidentally exposing internal details.
- Adds a small hierarchy of classes to maintain in `packages/utils`;
  a new failure category requires either reusing an existing subclass
  or adding a new one (and a new `ErrorCode`) deliberately.

## Tradeoffs

A fixed, deliberately small `ErrorCode` vocabulary (six codes as of
this ADR) is less expressive than an open-ended string error code per
call site, in exchange for keeping the client-facing error surface
small and predictable. New codes are added when a genuinely new
category of failure exists, not per endpoint.

## Future Implications

`apps/web` doesn't yet consume `ApiErrorResponse` from a real API call
(no feature code exists yet) — how client-side error handling surfaces
these shapes through TanStack Query's error state is a Milestone 1.0
concern, not designed here.
