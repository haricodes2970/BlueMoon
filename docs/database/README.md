# Database

Database documentation: schema design, migrations strategy, indexing,
and data retention policy.

Currently empty — database is decided (PostgreSQL via Drizzle, see
[ADR-0005](../adr/ADR-0005-postgresql.md), [ADR-0006](../adr/ADR-0006-drizzle.md));
schema and migration docs will be populated alongside implementation
(Milestone 1.0). Note: whether ephemeral session data needs a separate
store from PostgreSQL is still an open question — see ADR-0005 Future
Implications.
