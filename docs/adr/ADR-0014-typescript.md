# ADR-0014: TypeScript Across the Stack

- **Date:** 2026-07-22
- **Status:** Accepted

## Context

Strict TypeScript was already assumed as a coding standard (see
[coding-standards.md](../engineering/coding-standards.md)) from the
initial repository scaffold, but that assumption had not been recorded
as a formal decision. With the concrete stack now chosen (Next.js,
Hono, Drizzle, all TypeScript-native), it warrants an explicit ADR.

## Decision

Use TypeScript, in strict mode, across the entire stack — client
(Next.js), backend (Hono), and shared packages (types, config) in the
monorepo (ADR-0002).

## Alternatives Considered

- **Plain JavaScript:** rejected — forfeits compile-time type safety
  across the client/backend boundary, which matters given shared types
  are a primary reason for choosing a monorepo (ADR-0002).
- **TypeScript on frontend only, JS on backend:** rejected — Hono
  (ADR-0004) and Drizzle (ADR-0006) are both TypeScript-first tools;
  using JS on the backend would forfeit their main benefit (type-safe
  queries and request/response contracts) and break type sharing with
  the client.
- **Flow:** rejected — smaller ecosystem, declining adoption relative to
  TypeScript, and no tooling advantage for this stack.

## Consequences

- End-to-end type safety is achievable: database schema (Drizzle) →
  API (Hono) → client (Next.js) can share types through the monorepo's
  shared packages.
- All contributors must work in strict TypeScript; see
  [coding-standards.md](../engineering/coding-standards.md) for the
  specific conventions (no implicit `any`, explicit boundary types).

## Tradeoffs

Strict typing adds upfront authoring overhead compared to plain JS, in
exchange for catching a class of integration bugs (mismatched
client/server contracts) at compile time rather than in production.

## Future Implications

None expected — this decision underlies every other stack ADR in this
milestone (ADR-0003 through ADR-0013) and is not expected to be
revisited absent a fundamental stack change.
