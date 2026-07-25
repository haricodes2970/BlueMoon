# @bluemoon/database

Drizzle schema, migrations, and query layer for PostgreSQL (see
[ADR-0005](../../docs/adr/ADR-0005-postgresql.md),
[ADR-0006](../../docs/adr/ADR-0006-drizzle.md)), consumed by
`apps/server`.

Full responsibility definition: [Package-Architecture.md](../../docs/architecture/Package-Architecture.md#packagesdatabase).

## Status

As of Milestone 0.6, the Identity domain's schema is real (see
[Identity-Schema.md](../../docs/database/Identity-Schema.md)): `users`,
`devices`, `trusted_devices`, `sessions`, `refresh_tokens`,
`login_attempts`, `audit_events`. No other domain's schema exists yet.

## Layout

- `src/client.ts` — `createDatabase(connectionString)`, returns a
  Drizzle client backed by a `postgres.js` connection.
- `src/schema/` — one file per table (`users.ts`, `devices.ts`, etc.),
  re-exported from `src/schema/index.ts`.
- `src/health.ts` — `checkDatabaseConnection(db)`, a cheap `select 1`
  used by `apps/server`'s `/health` endpoint. Returns `false` instead
  of throwing so a down database reports "degraded," not a crash.
- `src/migrate.ts` — runs pending migrations (`pnpm db:migrate`).
- `src/seed.ts` — seed entry point (`pnpm db:seed`); intentionally
  empty — no seed data required yet.
- `drizzle.config.ts` — drizzle-kit config. Points `schema` at
  `dist/schema/index.js` (compiled output), not the `.ts` source —
  drizzle-kit's own loader can't resolve this project's ".js"-extension
  relative imports across multiple TS files (see
  `db:generate`'s script, which builds first).

## Usage

```bash
# Build, then generate a migration from schema changes
pnpm --filter @bluemoon/database db:generate

# Apply pending migrations (requires DATABASE_URL)
pnpm --filter @bluemoon/database db:migrate

# Run the seed entry point (requires DATABASE_URL)
pnpm --filter @bluemoon/database db:seed
```

`DATABASE_URL` is validated via `@bluemoon/config` at the consuming
app's startup (see
[environment-strategy.md](../../docs/engineering/environment-strategy.md));
these package-level scripts read `process.env.DATABASE_URL` directly
for standalone CLI use.
