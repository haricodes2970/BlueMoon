# @bluemoon/server

Backend API. Infrastructure only as of Milestone 0.5 — no messaging,
friends, users, or authentication logic (that starts Milestone 1.0).

- Framework: Hono ([ADR-0004](../../docs/adr/ADR-0004-hono.md)) with
  `@hono/zod-openapi` for OpenAPI schema + doc generation
- Database: PostgreSQL + Drizzle ([ADR-0005](../../docs/adr/ADR-0005-postgresql.md), [ADR-0006](../../docs/adr/ADR-0006-drizzle.md)), via `@bluemoon/database`
- Object storage: Cloudflare R2 ([ADR-0011](../../docs/adr/ADR-0011-cloudflare-r2.md)) — not yet wired up
- Hosting: Render ([ADR-0033](../../docs/adr/ADR-0033-adopt-render-for-backend-hosting.md); supersedes [ADR-0012](../../docs/adr/ADR-0012-railway.md))

## What exists

- `GET /health` — `{ status, version, environment }`; `status` is
  `"degraded"` if `DATABASE_URL` is set but unreachable, `"ok"`
  otherwise (including when no database is configured at all).
- `GET /openapi.json` — generated OpenAPI 3.0 document.
- `GET /docs` — Swagger UI reading the above.
- Centralized structured logging (`@bluemoon/utils`'s `createLogger`),
  pretty-printed in development, JSON in production/test.
- Request-ID middleware: every response carries `x-request-id`; all
  log lines for a request are scoped to it.
- Central error handler: Zod validation errors → `400` with per-field
  details; `AppError` subclasses → their mapped status; anything else →
  `500`, logged, never leaked as a raw message.
- Environment loaded via `@bluemoon/config`'s `loadEnv` — fails fast on
  an invalid/missing required variable at startup.

## Running

```bash
pnpm --filter @bluemoon/server dev     # tsx watch, dev logging
pnpm --filter @bluemoon/server build   # tsc -> dist/
pnpm --filter @bluemoon/server start   # node dist/index.js
```

See `.env.example` for required variables.
