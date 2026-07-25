# ADR-0021: Zod-Validated, Fail-Fast Environment Configuration

- **Date:** 2026-07-25
- **Status:** Accepted

## Context

Every app needs environment variables (ports, database URLs, log
levels) validated per
[environment-strategy.md](../engineering/environment-strategy.md)'s
dev/test/production conventions. An app starting successfully with a
missing or malformed required variable, only to fail later when that
variable is first used, is worse than failing immediately at startup
with a clear message.

## Decision

Use [Zod](https://zod.dev) schemas to validate `process.env`, via a
shared `packages/config` package: a `baseEnvSchema` (currently just
`NODE_ENV`) that every app extends with its own required variables
(`extendEnvSchema()`), and a `loadEnv()` function that parses eagerly
and throws `InvalidConfigError` — listing every validation issue — if
anything is missing or malformed. Apps call `loadEnv()` at the very
top of their entrypoint, before anything else runs.

## Alternatives Considered

- **Manual `process.env.X` reads with ad hoc `if (!x) throw` checks
  scattered through the codebase:** rejected — no single source of
  truth for what an app requires, easy to add a new required variable
  and forget to validate it, and failures happen wherever the variable
  is first read rather than at startup.
- **dotenv-safe or similar `.env.example`-diffing tools:** rejected as
  the primary mechanism — they check that keys exist, not that values
  are the right shape/type (e.g. `PORT` being a valid positive
  integer, `DATABASE_URL` being a valid URL). Zod validates both
  presence and shape in one pass.
- **envalid:** a reasonable, purpose-built alternative; Zod chosen
  instead because it's already a project dependency (used by
  `apps/server`'s request validation, per ADR-0004/Hono's ecosystem)
  and reusing it for config avoids a second validation library.

## Consequences

- Every app fails fast and loud at startup if configuration is
  invalid, with every issue listed at once (not one-at-a-time
  discovery) — see `packages/config/src/load-env.ts`.
- Type-safe config: `loadEnv()`'s return type is inferred directly
  from the Zod schema, so `env.PORT` is a `number`, not a raw string
  needing manual coercion at every call site.
- `packages/config` becomes a required dependency of every app that
  reads environment variables — consistent with its documented
  responsibility in
  [Package-Architecture.md](../architecture/Package-Architecture.md#packagesconfig).

## Tradeoffs

Fail-fast means an app with a config problem won't start at all,
rather than degrading partially — this is the intended tradeoff:
per [environment-strategy.md](../engineering/environment-strategy.md),
a misconfigured deployment should be caught immediately (at deploy/boot
time), not discovered by a user hitting a broken code path later.

## Future Implications

`apps/web`'s client-exposed (`NEXT_PUBLIC_*`) variables aren't yet
validated through this mechanism — Next.js's build-time env inlining
works differently from a Node process's `process.env`, and extending
`loadEnv()` to cover that is a follow-up, not yet designed.
