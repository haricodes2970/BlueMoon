# ADR-0005: PostgreSQL for Persistent Storage

- **Date:** 2026-07-22
- **Status:** Accepted

## Context

Per [Architecture Overview](../architecture/Architecture-Overview.md#system-boundaries),
the system needs storage for persisted relationship data (saved
contacts, retained history after a session converts). This data is
relational in nature (users, contacts, sessions, messages) and requires
strong consistency guarantees.

## Decision

Use PostgreSQL as the primary persistent data store.

## Alternatives Considered

- **MongoDB / document store:** rejected — the core data model
  (users, contacts, sessions, relationships between them) is relational;
  forcing it into a document model would fight the natural shape of the
  data described in
  [User Journey & Flow Specification](../product/user-journey-and-flow-specification.md).
- **MySQL:** a reasonable alternative; PostgreSQL preferred for stronger
  support for advanced types, extensions, and general ecosystem fit with
  the rest of the chosen stack (Drizzle, ADR-0006).
- **SQLite:** rejected for production persistent storage — insufficient
  concurrency model for a multi-user real-time product, though it may
  remain useful for local development/testing.

## Consequences

- Strong consistency and relational integrity for contact/relationship
  data.
- Requires a managed or self-hosted PostgreSQL instance in every
  environment (see ADR-0012 Railway for hosting).

## Tradeoffs

Relational databases require more upfront schema design discipline than
schemaless stores. Accepted because the core entities (users, sessions,
contacts) are well-understood and stable enough to model relationally
from the start.

## Future Implications

Ephemeral session data (per the ephemeral-first principle in
[Architecture Overview](../architecture/Architecture-Overview.md#architectural-principles))
may warrant a separate, faster-expiring store (e.g. an in-memory or
TTL-based store) distinct from PostgreSQL — this is a follow-up decision,
not covered by this ADR.
