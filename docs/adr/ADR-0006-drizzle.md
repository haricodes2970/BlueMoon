# ADR-0006: Drizzle as the ORM/Query Layer

- **Date:** 2026-07-22
- **Status:** Accepted

## Context

Given PostgreSQL (ADR-0005) and strict TypeScript
(ADR-0014/[coding standards](../engineering/coding-standards.md)), the
backend needs a type-safe way to query and migrate the database that
doesn't sacrifice control over generated SQL.

## Decision

Use Drizzle ORM as the query builder and migration tool.

## Alternatives Considered

- **Prisma:** a strong, more feature-complete alternative with a mature
  migration story; rejected as primary choice because Drizzle's
  SQL-like query builder gives closer-to-the-metal control and a
  lighter runtime, and its TypeScript-first types avoid a separate
  codegen step.
- **Raw SQL / query builder without an ORM (e.g. Kysely alone):**
  rejected — Drizzle offers similar type-safety with a more complete
  migrations toolchain out of the box.
- **TypeORM:** rejected — decorator-based, class-oriented style
  conflicts with the lighter, function-first style implied by the rest
  of the stack (Hono, ADR-0004).

## Consequences

- Database schema and query types stay in sync with TypeScript at
  compile time, reducing a class of runtime bugs.
- Migrations are managed through Drizzle's tooling, which the team must
  standardize on rather than hand-writing raw migration SQL.

## Tradeoffs

Drizzle's ecosystem and tooling are less mature than Prisma's. Accepted
because the tighter, more explicit SQL-like query style is preferred for
a small backend where query performance/clarity matters more than
higher-level abstraction.

## Future Implications

If schema complexity grows significantly, revisit whether Drizzle's
migration tooling still scales with team size — track any friction as a
future ADR rather than working around it silently.
