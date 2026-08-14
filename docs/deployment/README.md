# Deployment

Production deployment target: **Vercel** for `apps/web`
([ADR-0013](../adr/ADR-0013-vercel.md)), **Railway** for `apps/server`
and PostgreSQL ([ADR-0012](../adr/ADR-0012-railway.md)). No
Dockerfile, Railway config file, or Vercel config file exists in this
repository yet — both platforms build directly from the pnpm workspace
(Railway via Nixpacks/a build command, Vercel via its native Next.js
support) without one. This document describes what's actually
required to deploy correctly; it is not a claim that deploy pipelines
have been created or verified against a real Vercel/Railway account —
see Known Limitations below.

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
database is unreachable. Point Railway's health check at this path.
Note what it does _not_ catch: since `DATABASE_URL` is now required in
production (env.ts fails fast at startup instead), the previous
"health says ok with zero routes mounted" failure mode described in
ADR-0031 can no longer occur in a production deployment — a
misconfigured deploy fails to start at all, which Railway surfaces as
a failed deploy, not a passing health check on a broken service.

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

## Known Limitations

- No Dockerfile, `railway.json`/`railway.toml`, or `vercel.json`
  exists in this repository — both platforms are expected to build
  from the pnpm workspace using their own auto-detection, unverified
  against a real account on either platform.
- This document has not been verified end-to-end against an actual
  Railway + Vercel deployment — it describes what the current code
  requires and expects, based on direct inspection of `env.ts`,
  `app.ts`, `cookies.ts`, and the WebSocket transport, not a completed
  live deployment.
- CI (`.github/workflows/ci.yml`) has no deployment job — lint,
  type-check, test, build only. Deploying remains a manual step on
  both platforms.

## Related Documents

- [ADR-0012](../adr/ADR-0012-railway.md), [ADR-0013](../adr/ADR-0013-vercel.md) — platform selection
- [ADR-0031](../adr/ADR-0031-deployment-architecture.md) — cross-origin cookie/CORS/proxy-trust decisions
- [docs/security/Session-Management.md](../security/Session-Management.md) — cookie transport detail
- [docs/security/Messaging.md](../security/Messaging.md) — WebSocket production hardening, rate limiting
- [docs/engineering/environment-strategy.md](../engineering/environment-strategy.md) — env var conventions
