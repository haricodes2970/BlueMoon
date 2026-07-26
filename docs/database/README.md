# Database

Database documentation: schema design, migrations strategy, indexing,
and data retention policy.

- [Identity-Schema.md](./Identity-Schema.md) — the Identity bounded
  context's tables (Milestone 0.6): `users`, `devices`,
  `trusted_devices`, `sessions`, `refresh_tokens`, `login_attempts`,
  `audit_events`.

No other domain's schema exists yet. Database is decided (PostgreSQL
via Drizzle, see [ADR-0005](../adr/ADR-0005-postgresql.md),
[ADR-0006](../adr/ADR-0006-drizzle.md)). Note: whether ephemeral
session data needs a separate store from PostgreSQL is still an open
question — see ADR-0005 Future Implications.
