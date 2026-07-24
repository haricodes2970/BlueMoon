# @bluemoon/database

Drizzle schema, migrations, and query layer for PostgreSQL (see
[ADR-0005](../../docs/adr/ADR-0005-postgresql.md),
[ADR-0006](../../docs/adr/ADR-0006-drizzle.md)), consumed by
`apps/server`.

Full responsibility definition: [Package-Architecture.md](../../docs/architecture/Package-Architecture.md#packagesdatabase).

## Status

Infrastructure only, as of Milestone 0.5 — connection, migration
tooling, and seed entry point are wired up. **No business schema
exists yet** (`src/schema.ts` is intentionally empty); entities land
starting Milestone 1.0.

## Layout

- `src/client.ts` — `createDatabase(connectionString)`, returns a
  Drizzle client backed by a `postgres.js` connection.
- `src/schema.ts` — empty placeholder; future tables are added here.
- `src/health.ts` — `checkDatabaseConnection(db)`, a cheap `select 1`
  used by `apps/server`'s `/health` endpoint. Returns `false` instead
  of throwing so a down database reports "degraded," not a crash.
- `src/migrate.ts` — runs pending migrations (`pnpm db:migrate`).
- `src/seed.ts` — seed entry point (`pnpm db:seed`); no-op until real
  schema/seed data exists.
- `drizzle.config.ts` — drizzle-kit config (schema path, migrations
  output, PostgreSQL dialect).

## Usage

```bash
# Generate a migration from schema changes
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
