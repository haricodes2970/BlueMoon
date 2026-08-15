# Deployment

Production deployment target: **Vercel** for `apps/web`
([ADR-0013](../adr/ADR-0013-vercel.md)), **Railway** for `apps/server`
via a Docker build ([ADR-0012](../adr/ADR-0012-railway.md),
[ADR-0032](../adr/ADR-0032-server-docker-deployment.md)), and Railway
PostgreSQL (or any compatible managed PostgreSQL). `apps/web` has no
`vercel.json` — Vercel's native Next.js monorepo support (Root
Directory = `apps/web` in project settings) needs no custom
configuration. `apps/server` has a production `Dockerfile`
(`apps/server/Dockerfile`) and a `railway.json` pointing Railway at it
— see [ADR-0032](../adr/ADR-0032-server-docker-deployment.md) for why
Docker was chosen over Railway's zero-config Nixpacks builder for this
specific pnpm/Turborepo workspace shape.

This document distinguishes two levels of readiness, defined
precisely in [Milestone 1.0's completion
criteria](#milestone-10-completion-criteria) below — **repository
deployment readiness** (verified, see that section) and **external
deployment verification** (Vercel/Railway/managed PostgreSQL actually
exercised — not yet performed; see Known Limitations).

See [ADR-0031](../adr/ADR-0031-deployment-architecture.md) for the
reasoning behind the cross-origin/cookie/proxy-trust decisions
referenced throughout this document.

## Two Supported Domain Shapes

The cookie-based refresh flow (`docs/security/Session-Management.md`)
behaves differently depending on how `apps/web` and `apps/server` are
deployed relative to each other. Pick one:

**Preferred: custom subdomains under one apex domain**
(`app.example.com` for Vercel, `api.example.com` for Railway).
Browsers treat these as "same-site" (registrable domain matches, only
the subdomain differs), so `COOKIE_SAME_SITE=Lax` (the default) works
correctly and needs no further configuration.

**Fallback: the platforms' default domains**
(`*.vercel.app`, `*.up.railway.app`). These are genuinely different
registrable domains — a `Lax` cookie would never be sent back on a
cross-origin request. Set `COOKIE_SAME_SITE=None` on `apps/server`.
This is only accepted when `NODE_ENV=production` (env.ts fails fast
otherwise, since a `SameSite=None` cookie must also be `Secure`).

## `apps/server` (Railway) Environment Variables

| Variable                  | Required in production? | Notes                                                                                                                                       |
| ------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                | Yes (`production`)      | Gates the fail-fast checks below, `Secure` cookies, and pretty-vs-JSON logging.                                                             |
| `DATABASE_URL`            | Yes                     | Railway's PostgreSQL plugin provides this automatically when attached to the service.                                                       |
| `JWT_ACCESS_TOKEN_SECRET` | Yes                     | 32+ bytes. Generate with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.                                   |
| `WEB_ORIGIN`              | Yes                     | The real deployed `apps/web` origin, e.g. `https://app.example.com`. Must not be the localhost default — env.ts refuses to start otherwise. |
| `COOKIE_SAME_SITE`        | No (default `Lax`)      | Set to `None` only under the fallback domain shape above.                                                                                   |
| `PORT`                    | No (default `8787`)     | Railway injects its own `PORT`; the app already reads `process.env.PORT` via `loadServerEnv()`.                                             |
| `LOG_LEVEL`               | No (default `info`)     | `debug`/`trace` are verbose; avoid in production under sustained load.                                                                      |

`env.ts` validates all of this at startup via a Zod schema and
`superRefine` — an incomplete or inconsistent production configuration
fails fast with a listed set of issues, rather than starting in a
partially-broken state.

## Production Environment Contract

The authoritative variable list for `apps/server`. `.env.example`
mirrors this table with placeholder values only — never real secrets.

| Variable                  | Dev                               | Test                             | Production                                                     | Secret? | Configured where                                          |
| ------------------------- | --------------------------------- | -------------------------------- | -------------------------------------------------------------- | ------- | --------------------------------------------------------- |
| `NODE_ENV`                | `development` (default)           | `test`                           | `production` — required, gates every check below               | No      | Railway service variables                                 |
| `DATABASE_URL`            | optional (routes unmount)         | not used by `pnpm test`          | **required** — fail-fast if missing                            | Yes     | Railway PostgreSQL plugin (auto-injected) or manual       |
| `TEST_DATABASE_URL`       | optional                          | required for `pnpm test:db` only | not used                                                       | Yes     | local `.env.local` / CI secret, never production          |
| `JWT_ACCESS_TOKEN_SECRET` | any 32+ byte string               | fixture value                    | **required**, 32+ random bytes                                 | Yes     | Railway service variables                                 |
| `WEB_ORIGIN`              | `http://localhost:3000` (default) | fixture value                    | **required**, must not be the localhost default                | No      | Railway service variables (set to the real Vercel domain) |
| `COOKIE_SAME_SITE`        | `Lax` (default)                   | `Lax`                            | `Lax` (preferred) or `None` (platform-default-domain fallback) | No      | Railway service variables                                 |
| `PORT`                    | `8787` (default)                  | n/a                              | Railway-injected — do not set manually                         | No      | Railway (automatic)                                       |
| `LOG_LEVEL`               | `info` (default)                  | `silent` (test setup)            | `info` (default); avoid `debug`/`trace` under load             | No      | Railway service variables                                 |

`apps/web`:

| Variable              | Dev                               | Production                                           | Secret?                                                            | Configured where                     |
| --------------------- | --------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------ |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8787` (default) | **required**, the real deployed `apps/server` origin | No — `NEXT_PUBLIC_*` vars are bundled into client JS, never secret | Vercel project environment variables |

`NEXT_PUBLIC_API_URL` is not a secret by definition (Next.js inlines
`NEXT_PUBLIC_*` variables into the client bundle) — never put a secret
behind that prefix.

## `apps/web` (Vercel) Environment Variables

| Variable              | Required? | Notes                                                                                                                                                                                           |
| --------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Yes       | The real deployed `apps/server` origin, e.g. `https://api.example.com`. `lib/api-client.ts` derives the WebSocket URL (`ws:`/`wss:`) from this at runtime — no separate WS URL variable needed. |

## Migrations

`packages/database/src/migrate.ts` is a standalone script
(`DATABASE_URL` from the environment, `drizzle-orm/postgres-js/
migrator`) — it is **not** run automatically on `apps/server` startup.
Run it explicitly against the target database as a deploy step (e.g. a
Railway pre-deploy/release command, or manually before the first
deploy), never automatically against whatever `DATABASE_URL` happens
to be set in an environment. A fresh database migrates cleanly from
zero — verified in this repository against a disposable local
PostgreSQL instance (`docker-compose.yml`); this has not been verified
against an actual Railway PostgreSQL instance.

## Docker Build (`apps/server`)

`apps/server/Dockerfile` is a three-stage build, run from the
**repository root** (not `apps/server/`) so the pnpm workspace and
Turborepo graph resolve correctly — `apps/server` depends on four
workspace packages (`config`, `database`, `types`, `utils`) that must
be built and present in `node_modules`, not just its own source:

```
docker build -f apps/server/Dockerfile -t bluemoon-server .
docker run -p 8787:8787 --env-file apps/server/.env bluemoon-server
```

1. **builder** — installs only `@bluemoon/server` and its workspace
   dependencies (`pnpm install --filter=@bluemoon/server...`,
   deliberately never touches `apps/web`'s Next.js/sharp/etc.
   dependency tree), then runs `pnpm turbo run build
--filter=@bluemoon/server...`.
2. **prod-deps** — a second, production-only `pnpm install --prod
--filter=@bluemoon/server...` for a `node_modules` tree with no
   devDependencies.
3. **runtime** — `node:20-alpine`, copies only `prod-deps`'s
   `node_modules` and `builder`'s compiled `dist/` output for
   `apps/server` and its four dependencies. No source, no build
   tools, no dev dependencies. `NODE_ENV=production` is baked in;
   every other variable ([contract above](#production-environment-contract))
   is supplied at `docker run`/Railway deploy time, never baked into
   the image.

Verified locally (2026-08-15): the image builds successfully, starts
against a real disposable PostgreSQL instance
(`docker-compose.yml`) with production-shaped environment variables,
and serves the full golden path (see [Milestone 1.0 Completion
Criteria](#milestone-10-completion-criteria) below). Image size ≈230MB.
`.dockerignore` (repository root) excludes `node_modules`, `dist`,
`.next`, `.git`, and every `.env*` file except `.env.example`.

Database migrations are **not** part of this image or its `CMD` — see
Migrations above; they stay a separate, explicit step regardless of
how the server itself is deployed.

## WebSocket Requirements

`/messaging/ws` needs a platform that supports long-lived WebSocket
connections on the same process serving HTTP — Railway does (it's a
regular long-running container, not a serverless function per
request). This would **not** work unmodified on a serverless
HTTP-function platform. See
`docs/security/Messaging.md#websocket-production-hardening` for the
origin-validation/max-payload/heartbeat/graceful-shutdown behavior
that makes long-lived connections production-safe (stale-connection
cleanup, a bounded drain on redeploy, an upper bound on a single
frame's memory cost).

## CORS

`apps/server` allows exactly one origin (`WEB_ORIGIN`) with
`credentials: true` (`app.ts`) — required for the browser to
send/store the `bm_refresh` cookie cross-origin at all, independent of
`SameSite`. There is no wildcard/multi-origin support; a staging
environment needs its own `WEB_ORIGIN` value pointed at its own
frontend deployment, not a shared production value.

## Health Checks

`GET /health` returns `{ status: "ok" | "degraded", version,
environment }` — `degraded` when `DATABASE_URL` is set but the
database is unreachable. Point Railway's health check at this path
(`railway.json` already does — `deploy.healthcheckPath`). Requires no
authentication, by design. Note what it does _not_ catch: since
`DATABASE_URL` is now required in production (env.ts fails fast at
startup instead), the previous "health says ok with zero routes
mounted" failure mode described in ADR-0031 can no longer occur in a
production deployment — a misconfigured deploy fails to start at all,
which Railway surfaces as a failed deploy, not a passing health check
on a broken service.

`registerHealthRoute` reuses the one connection pool `app.ts` already
builds for Identity/Social/Messaging rather than opening its own —
fixed during Milestone 1.0's deployment verification, when a Docker-
based local run made it obvious that the previous implementation
opened a brand-new `postgres.js` pool on every single `/health` call
and never closed it, which a platform health checker polling every
few seconds would have exhausted `max_connections` on over time.

## Rollback

No automated rollback tooling exists. Railway supports redeploying a
previous build from its dashboard; Vercel does the same for `apps/web`
via its deployment history. A rollback that also needs a migration
rolled back requires a manual, hand-written down-migration — Drizzle's
generated migrations in this repository are forward-only
(`packages/database/migrations/`); none has been reverted in practice.
Roll back application code before ever considering rolling back a
migration that's already run against production data.

## Known Single-Process Limitations

Everything below requires a shared external store (Redis is the
natural fit, not introduced yet — see
[ADR-0031](../adr/ADR-0031-deployment-architecture.md) Alternatives
Considered) before `apps/server` can correctly run as more than one
instance:

- The rate limiter (`infrastructure/identity/rate-limiter.ts`) — a
  multi-instance deployment effectively multiplies every limit by
  instance count.
- Messaging's `PresenceRegistry`/`MessageBroadcaster`
  (`infrastructure/messaging/`) — a user connected to instance A never
  receives a broadcast triggered on instance B.

A single Railway service instance (the only configuration this
codebase has actually been exercised against) is unaffected by either
limitation.

## Milestone 1.0 Completion Criteria

Two distinct levels, not to be conflated:

**1.1 Repository Deployment Ready — DONE (2026-08-15)**

- `apps/server/Dockerfile` + `.dockerignore` + `railway.json` exist
  and are documented above.
- Production build verified: `docker build` succeeds from a clean
  checkout.
- Production startup verified: the built image, run with
  production-shaped environment variables against a real (local,
  disposable) PostgreSQL instance, starts, passes `/health`, and
  serves traffic.
- Environment contract documented (above), `.env.example` files
  updated, no secrets committed.
- Local smoke test passed against the running container: register
  (x2) → CORS allowed/rejected origin checked → BlueMoon Token
  generated and consumed → Friendship created → WS tickets issued for
  both users → old `?access_token=` query-string scheme confirmed
  rejected → both users connect over `/messaging/ws?ticket=...` → a
  conversation is created → a message sent by one user is persisted
  _and_ received by the other over the live WebSocket → the message
  is retrievable via `GET .../messages` → `POST /auth/refresh` via the
  `bm_refresh` cookie succeeds → logout succeeds.

**1.1 External Deployment Verified — NOT DONE**

- No actual Vercel deployment has been performed.
- No actual Railway deployment has been performed.
- No actual managed PostgreSQL instance (Railway's or otherwise) has
  been used — only the local `docker-compose.yml` instance.
- HTTPS/WSS have not been verified against real TLS termination (only
  `ws://`/`http://` locally — the code derives `wss:`/`https:` from
  `NEXT_PUBLIC_API_URL`'s protocol, see `lib/api-client.ts`'s `wsUrl`,
  but this has not been exercised against a real certificate).
- No browser-based golden path has been run against deployed
  infrastructure (only Node-script HTTP/WS requests against the local
  container, and the Milestone 1.0 browser verification against
  locally-run dev servers, not this Docker image).

**Repository deployment readiness verified locally; external
Vercel/Railway deployment remains unverified.**

## Known Limitations

- No `vercel.json` exists — intentional, Vercel's native Next.js
  monorepo support needs no custom configuration for this repository
  shape; only the project's Root Directory setting needs to be
  `apps/web`, done in Vercel's dashboard, not a committed file.
- This document has not been verified end-to-end against an actual
  Railway + Vercel deployment — see Milestone 1.0 Completion Criteria
  above for exactly what has and hasn't been verified.
- CI (`.github/workflows/ci.yml`) has no deployment job and does not
  build the Docker image — lint, type-check, test, build only.
  Deploying remains a manual step on both platforms.
- The Docker image has been built and run locally against a
  disposable PostgreSQL instance, never against Railway's build
  environment or Railway's own PostgreSQL plugin.

## Related Documents

- [ADR-0012](../adr/ADR-0012-railway.md), [ADR-0013](../adr/ADR-0013-vercel.md) — platform selection
- [ADR-0031](../adr/ADR-0031-deployment-architecture.md) — cross-origin cookie/CORS/proxy-trust decisions
- [ADR-0032](../adr/ADR-0032-server-docker-deployment.md) — Docker as the Railway build mechanism
- [docs/security/Session-Management.md](../security/Session-Management.md) — cookie transport detail
- [docs/security/Messaging.md](../security/Messaging.md) — WebSocket production hardening, rate limiting
- [docs/engineering/environment-strategy.md](../engineering/environment-strategy.md) — env var conventions
