# Deployment

Production deployment target: **Vercel** for `apps/web`
([ADR-0013](../adr/ADR-0013-vercel.md)), **Render** for `apps/server`
via a Docker build and **Render PostgreSQL**
([ADR-0033](../adr/ADR-0033-adopt-render-for-backend-hosting.md),
superseding [ADR-0012](../adr/ADR-0012-railway.md)'s original Railway
choice; the underlying Docker mechanism itself is unchanged, see
[ADR-0032](../adr/ADR-0032-server-docker-deployment.md)). `apps/web`
has no `vercel.json` — Vercel's native Next.js monorepo support (Root
Directory = `apps/web` in project settings) needs no custom
configuration. `apps/server` has a production `Dockerfile`
(repository root — moved from `apps/server/Dockerfile` 2026-08-16, see
the Troubleshooting section below; content unchanged from the
Railway-targeted version) and a `render.yaml` Blueprint at the
repository root defining
both the web service and the PostgreSQL database — see
[ADR-0033](../adr/ADR-0033-adopt-render-for-backend-hosting.md) for
why a Blueprint was chosen (primarily: it wires `DATABASE_URL` to
Render's _internal_ connection string automatically, and generates
`JWT_ACCESS_TOKEN_SECRET` without a human ever handling it).

This document distinguishes two levels of readiness, defined
precisely in [Milestone 1.0's completion
criteria](#milestone-10-completion-criteria) below — **repository
deployment readiness** (verified against Docker + a local PostgreSQL
instance, see that section) and **external deployment verification**
(Vercel/Render/Render PostgreSQL actually exercised — not yet
performed; see Known Limitations).

See [ADR-0031](../adr/ADR-0031-deployment-architecture.md) for the
reasoning behind the cross-origin/cookie/proxy-trust decisions
referenced throughout this document — unaffected by the Railway→Render
platform change (see ADR-0033).

## Two Supported Domain Shapes

The cookie-based refresh flow (`docs/security/Session-Management.md`)
behaves differently depending on how `apps/web` and `apps/server` are
deployed relative to each other. Pick one:

**Preferred: custom subdomains under one apex domain**
(`app.example.com` for Vercel, `api.example.com` for Render).
Browsers treat these as "same-site" (registrable domain matches, only
the subdomain differs), so `COOKIE_SAME_SITE=Lax` (the default) works
correctly and needs no further configuration.

**Fallback: the platforms' default domains**
(`*.vercel.app`, `*.onrender.com`). These are genuinely different
registrable domains — a `Lax` cookie would never be sent back on a
cross-origin request. Set `COOKIE_SAME_SITE=None` on `apps/server`.
This is only accepted when `NODE_ENV=production` (env.ts fails fast
otherwise, since a `SameSite=None` cookie must also be `Secure`).

**This is the shape actually in use.** `apps/web` is deployed at
`https://blue-moon-web-zeta.vercel.app` (Vercel's default domain, no
custom domain configured) and `apps/server` will deploy to Render's
default `*.onrender.com` domain — `render.yaml` is set accordingly
(`WEB_ORIGIN=https://blue-moon-web-zeta.vercel.app`,
`COOKIE_SAME_SITE=None`).

## `apps/server` (Render) Environment Variables

| Variable                  | Required in production? | Notes                                                                                                                                                                                                                                                 |
| ------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                | Yes (`production`)      | Gates the fail-fast checks below, `Secure` cookies, and pretty-vs-JSON logging. `render.yaml` sets this.                                                                                                                                              |
| `DATABASE_URL`            | Yes                     | Wired automatically by `render.yaml`'s `fromDatabase: {property: connectionString}` — resolves to Render's **internal** connection string.                                                                                                            |
| `JWT_ACCESS_TOKEN_SECRET` | Yes                     | 32+ bytes. `render.yaml` uses `generateValue: true` — Render generates and stores this on first deploy; no human ever handles the raw value.                                                                                                          |
| `WEB_ORIGIN`              | Yes                     | `https://blue-moon-web-zeta.vercel.app` — the real deployed `apps/web` origin. Must not be the localhost default — env.ts refuses to start otherwise. `render.yaml` hardcodes this value (not a secret); update it if the Vercel origin ever changes. |
| `COOKIE_SAME_SITE`        | No (default `Lax`)      | `render.yaml` sets `None` — `apps/web` and `apps/server` are on different registrable domains (`*.vercel.app` / `*.onrender.com`), the fallback domain shape above.                                                                                   |
| `PORT`                    | No (default `8787`)     | Render injects its own `PORT`; the app already reads `process.env.PORT` via `loadServerEnv()`. Not set in `render.yaml` — leave it to Render.                                                                                                         |
| `LOG_LEVEL`               | No (default `info`)     | `debug`/`trace` are verbose; avoid in production under sustained load.                                                                                                                                                                                |

`env.ts` validates all of this at startup via a Zod schema and
`superRefine` — an incomplete or inconsistent production configuration
fails fast with a listed set of issues, rather than starting in a
partially-broken state.

## Production Environment Contract

The authoritative variable list for `apps/server`. `.env.example`
mirrors this table with placeholder values only — never real secrets.

| Variable                  | Dev                               | Test                             | Production                                                  | Secret? | Configured where                                               |
| ------------------------- | --------------------------------- | -------------------------------- | ----------------------------------------------------------- | ------- | -------------------------------------------------------------- |
| `NODE_ENV`                | `development` (default)           | `test`                           | `production` — required, gates every check below            | No      | `render.yaml` (`value: production`)                            |
| `DATABASE_URL`            | optional (routes unmount)         | not used by `pnpm test`          | **required** — fail-fast if missing                         | Yes     | `render.yaml` (`fromDatabase`, resolves to the internal URL)   |
| `TEST_DATABASE_URL`       | optional                          | required for `pnpm test:db` only | not used                                                    | Yes     | local `.env.local` / CI secret, never production               |
| `JWT_ACCESS_TOKEN_SECRET` | any 32+ byte string               | fixture value                    | **required**, 32+ random bytes                              | Yes     | `render.yaml` (`generateValue: true`)                          |
| `WEB_ORIGIN`              | `http://localhost:3000` (default) | fixture value                    | **required**, must not be the localhost default             | No      | `render.yaml` (`value: https://blue-moon-web-zeta.vercel.app`) |
| `COOKIE_SAME_SITE`        | `Lax` (default)                   | `Lax`                            | `None` — required, platform-default-domain fallback applies | No      | `render.yaml` (`value: None`)                                  |
| `PORT`                    | `8787` (default)                  | n/a                              | Render-injected — do not set manually                       | No      | Render (automatic)                                             |
| `LOG_LEVEL`               | `info` (default)                  | `silent` (test setup)            | `info` (default); avoid `debug`/`trace` under load          | No      | `render.yaml` (`value: info`)                                  |

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
migrator`) — it is **not** run automatically on `apps/server` startup,
and `render.yaml` does not define a pre-deploy command that would run
it either. Run it explicitly against the target database as a
deliberate deploy step: from a local machine with `DATABASE_URL` (or
Render's PostgreSQL **external** connection string, for a one-off
migration run from outside Render's network) pointed at the Render
Postgres instance —

```
DATABASE_URL=<render-postgres-external-url> pnpm --filter @bluemoon/database db:migrate
```

— never automatically against whatever `DATABASE_URL` happens to be
set in an environment. A fresh database migrates cleanly from zero —
verified in this repository against a disposable local PostgreSQL
instance (`docker-compose.yml`); this has not been verified against an
actual Render PostgreSQL instance.

## Docker Build (`apps/server`)

`Dockerfile` (repository root — see the Troubleshooting entry below
for why it lives here and not under `apps/server/`) is a three-stage
build, run from the **repository root** so the pnpm workspace and
Turborepo graph resolve correctly — `apps/server` depends on four
workspace packages (`config`, `database`, `types`, `utils`) that must
be built and present in `node_modules`, not just its own source:

```
docker build -f Dockerfile -t bluemoon-server .
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
   is supplied at `docker run`/Render deploy time, never baked into
   the image.

Render builds this exact Dockerfile directly (`render.yaml`'s
`runtime: docker`, `dockerfilePath: ./Dockerfile`, `dockerContext: ./`
— the context must be the repository root, same requirement as the
manual `docker build` command above, for the same pnpm/Turborepo
workspace-graph reason). No changes were needed to the Dockerfile's
_content_ when the platform target moved from Railway to Render — see
[ADR-0033](../adr/ADR-0033-adopt-render-for-backend-hosting.md) — but
its _location_ did change on 2026-08-16; see Troubleshooting below.

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

### Troubleshooting: `COPY packages/... not found` during the Render build

Symptom: the Render build log fails on one of the `builder` stage's
`COPY` instructions (`apps/server`, `packages/config`,
`packages/database`, `packages/types`, `packages/utils`,
`tooling/typescript-config`, `turbo.json`) with `"...": not found`.

Diagnosed 2026-08-16: this is **not** a defect in
`apps/server/Dockerfile` or `render.yaml`. Confirmed by reproducing
Render's exact build command from a clean checkout:

```
docker build --no-cache -f apps/server/Dockerfile .
```

— this succeeds every time (verified against this exact Dockerfile and
`render.yaml`, both unchanged in that respect by this troubleshooting
pass). `render.yaml`'s `dockerContext: .` is a real, documented
Blueprint field (confirmed against Render's own Blueprint Spec
documentation) that sets the build context to the repository root
independently of `dockerfilePath` — exactly what a monorepo Dockerfile
that `COPY`s root-level workspace files needs.

The failure means the **live Render service is not building from this
`render.yaml`** — almost always because the service was created
through Render's "New → Web Service" flow (pointing directly at
`apps/server/Dockerfile`) before this Blueprint existed, rather than
through "New → Blueprint". A manually-created Docker service defaults
its build context to the Dockerfile's own directory
(`apps/server/`) unless a Blueprint or an explicit dashboard setting
says otherwise — which reproduces exactly this symptom, since none of
the repo-root files (`turbo.json`, `packages/*`, `tooling/*`) exist
under `apps/server/`.

Fix (manual, in the Render dashboard — cannot be done from this
repository):

1. **Preferred** — delete the manually-created service and recreate it
   via "New" → "Blueprint", pointing at this repository. Render then
   reads `render.yaml` directly, including `dockerContext: .`.
2. **Alternative** — keep the existing service, but in its Settings →
   Build & Deploy, set "Docker Build Context Directory" to the
   repository root (blank or `.`) to match `render.yaml` by hand, and
   keep "Dockerfile Path" as `apps/server/Dockerfile`.

Either way, no code or Blueprint change is required — only the live
service's configuration needs to match what's already committed.

**Update, 2026-08-16 — same failure after deleting and recreating the
service.** This ruled out the manually-created-service theory above,
so the investigation went deeper, checking every layer between this
repository and Render's build daemon rather than re-asserting the
dashboard explanation:

1. **Every path the Dockerfile references is actually in the pushed
   commit.** `git ls-tree origin/main -- turbo.json packages/utils
apps/server tooling/typescript-config ...` (all thirteen COPY
   sources) confirmed present, at the exact commit `HEAD` and
   `origin/main` both point to — not just present locally.
2. **`render.yaml` is schema-valid.** Downloaded Render's own published
   JSON Schema (`https://render.com/schema/render.yaml.json`) and
   validated this repository's `render.yaml` against it with `ajv`
   directly — passes with zero errors. This isn't a guess about field
   names; it's Render's own machine-readable contract confirming
   `dockerfilePath`/`dockerContext` are spelled, typed, and placed
   correctly.
3. **The field semantics are correctly understood**, confirmed three
   independent ways (Render's docs prose, Render's own `render-docker`
   Blueprint-authoring skill's example, and the JSON Schema's own
   `description` strings) — all agree `dockerfilePath` and
   `dockerContext` are each independently relative to the **repository
   root**, exactly how this file uses them.
4. **The Dockerfile itself is proven correct**, independent of Render,
   by a clean `docker build --no-cache -f apps/server/Dockerfile .`
   from repo root against that same commit.

No defect was found in the repository at any of these four layers.
Given that, and that recreating the service didn't change the outcome,
the remaining explanation is outside what this repository controls —
either a live-service/account state this investigation has no access
to verify (e.g. the recreated service pointing at a different
branch/fork, or a stale Blueprint sync not actually re-reading the
latest commit), or a Render platform-side limitation in how its
BuildKit git-context construction handles a Dockerfile nested in a
subdirectory whose `COPY` instructions reach outside that subdirectory
via `dockerContext`. As a zero-risk hardening step (not a confirmed
fix — nothing reproduces locally to test against), `dockerfilePath`
and `dockerContext` were changed to `./apps/server/Dockerfile` and
`./` respectively, matching Render's own documented example's
explicit-`./`-prefix style byte-for-byte, in case there's a path-join
edge case around a bare `.` or an unprefixed relative path. Re-verified
schema-valid and rebuilds clean after the change.

**If this still fails on Render**, the next step is Render support
directly, with this evidence attached: commit SHA
`798641850a0dd8f77794825076c8924f3f903f86`, the `ajv` schema-validation
pass, and the `git ls-tree origin/main` output proving every referenced
path exists in the deployed commit — not further repository changes,
since none of the four verification layers above found anything left
to fix here.

**Update, 2026-08-16 (same day) — the `./`-prefix hardening didn't
resolve it either.** The failure recurred, still on paths outside
`apps/server/` (most recently `tooling/typescript-config`). At this
point every angle available from inside this repository had been
checked and found correct — the `./`-prefix change was explicitly
labeled "not a confirmed fix" above because nothing local could
actually test a bare `.` vs. `./`-prefixed path against Render's
builder, and that prediction held.

Rather than continue adjusting `dockerContext` values that can't be
tested locally, the fix changed the one thing that removes
`dockerContext` from the equation entirely: **`Dockerfile` moved from
`apps/server/Dockerfile` to the repository root** (`git mv`, zero
internal `COPY` path changes — every path in it was already relative
to repo root, independent of where the file itself lives).
`render.yaml`'s `dockerfilePath` became `./Dockerfile`. This mirrors
Render's own documented monorepo example
(`docs/monorepo-support`, `rootDir: community/docker` +
`dockerfilePath: ./Dockerfile` — the Dockerfile always sits _at_ the
directory Render treats as build root in every example Render
publishes) rather than relying on `dockerContext` reaching outside a
nested Dockerfile's own directory, which the repeated failures across
two separate service recreations suggest Render's builder does not
reliably honor for this configuration shape.

Re-verified after the move: `docker build --no-cache -f Dockerfile .`
clean from repo root; the resulting production container passes
`/health` against a disposable PostgreSQL instance; the full golden
path (register both users → login → BlueMoon Token → friendship → WS
tickets for both → WebSocket connect for both → conversation → message
sent by one delivered live to the other over WS → retrievable via HTTP
history → `POST /auth/refresh` → logout) was scripted and run
end-to-end against the relocated Dockerfile's container, every step
passed. This is still not proof Render itself will now build
successfully — that can only be confirmed by an actual Render deploy,
which remains outside what this environment can verify — but it
removes the specific mechanism (`dockerContext` reliability) every
prior failure was consistent with.

## WebSocket Requirements

`/messaging/ws` needs a platform that supports long-lived WebSocket
connections on the same process serving HTTP — Render's Web Services
do (a regular long-running container with native WebSocket support on
the same domain/port as HTTP, no special configuration required; see
Render's own WebSocket documentation). This would **not** work
unmodified on a serverless HTTP-function platform. See
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
database is unreachable. Render's health check is already pointed at
this path (`render.yaml`'s `healthCheckPath: /health`). Requires no
authentication, by design. Note what it does _not_ catch: since
`DATABASE_URL` is now required in production (env.ts fails fast at
startup instead), the previous "health says ok with zero routes
mounted" failure mode described in ADR-0031 can no longer occur in a
production deployment — a misconfigured deploy fails to start at all,
which Render surfaces as a failed deploy, not a passing health check
on a broken service.

`registerHealthRoute` reuses the one connection pool `app.ts` already
builds for Identity/Social/Messaging rather than opening its own —
fixed during Milestone 1.0's deployment verification, when a Docker-
based local run made it obvious that the previous implementation
opened a brand-new `postgres.js` pool on every single `/health` call
and never closed it, which a platform health checker polling every
few seconds would have exhausted `max_connections` on over time.

## Rollback

No automated rollback tooling exists. Render supports redeploying a
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

A single Render service instance (the only configuration this
codebase has actually been exercised against) is unaffected by either
limitation.

## Milestone 1.0 Completion Criteria

Two distinct levels, not to be conflated:

**1.1 Repository Deployment Ready — DONE (2026-08-15, updated 2026-08-16 for Render)**

- `apps/server/Dockerfile` + `.dockerignore` + `render.yaml` exist
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
- No actual Render deployment has been performed.
- No actual managed PostgreSQL instance (Render's or otherwise) has
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
Vercel/Render deployment remains unverified.**

## Known Limitations

- No `vercel.json` exists — intentional, Vercel's native Next.js
  monorepo support needs no custom configuration for this repository
  shape; only the project's Root Directory setting needs to be
  `apps/web`, done in Vercel's dashboard, not a committed file.
- This document has not been verified end-to-end against an actual
  Render + Vercel deployment — see Milestone 1.0 Completion Criteria
  above for exactly what has and hasn't been verified.
- CI (`.github/workflows/ci.yml`) has no deployment job and does not
  build the Docker image — lint, type-check, test, build only.
  Deploying remains a manual step on both platforms.
- The Docker image has been built and run locally against a
  disposable PostgreSQL instance, never against Render's build
  environment or Render's own PostgreSQL instance.
- `render.yaml`'s `plan`/`region` values are placeholders (free tier,
  `oregon`) — review and adjust before applying the Blueprint if the
  intended deployment needs a different plan or region.

## Related Documents

- [ADR-0033](../adr/ADR-0033-adopt-render-for-backend-hosting.md) — adopting Render, superseding ADR-0012
- [ADR-0012](../adr/ADR-0012-railway.md), [ADR-0013](../adr/ADR-0013-vercel.md) — original platform selection
- [ADR-0031](../adr/ADR-0031-deployment-architecture.md) — cross-origin cookie/CORS/proxy-trust decisions
- [ADR-0032](../adr/ADR-0032-server-docker-deployment.md) — Docker as the build mechanism
- [docs/security/Session-Management.md](../security/Session-Management.md) — cookie transport detail
- [docs/security/Messaging.md](../security/Messaging.md) — WebSocket production hardening, rate limiting
- [docs/engineering/environment-strategy.md](../engineering/environment-strategy.md) — env var conventions
