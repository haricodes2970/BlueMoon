# ADR-0031: Deployment Architecture — Cross-Origin Cookies, Proxy Trust, and Production Fail-Fast Config

- **Date:** 2026-08-13
- **Status:** Accepted

## Context

Milestone 1.0 shipped a working vertical slice, but the workspace had
never been audited against the actual intended deployment target:
Vercel (frontend, ADR-0013), Railway (backend + PostgreSQL, ADR-0012),
apps/web and apps/server as two separately-hosted services. No
Dockerfile, Railway config, or Vercel config existed yet — deploy
pipelines were explicitly deferred (TODO.md, ROADMAP.md Milestone
0.3). A production-hardening audit inspected every deployment-relevant
piece of configuration (env validation, CORS, cookies, WebSocket
server, rate limiting, IP trust, migrations) against that target and
found several genuine gaps that would break or weaken the deployed
system, not hypothetical ones.

## Decision

**1. `bm_refresh` cookie's `SameSite` attribute is now configurable
(`COOKIE_SAME_SITE`, env.ts), not hardcoded to `Lax`.** The refresh
cookie (Session-Management.md) is `httpOnly` + `Secure` outside
development + scoped to `/auth`. `SameSite=Lax` only survives a
cross-origin `fetch()` when the two origins share a registrable
domain (e.g. `app.example.com` and `api.example.com` are "same-site"
despite being different origins) — Vercel's and Railway's _default_
domains (`*.vercel.app`, `*.up.railway.app`) do not share one, so a
`Lax` cookie set by apps/server would never be sent back by apps/web
on a cross-origin `POST /auth/refresh`, silently breaking the refresh
flow in that exact deployment shape. `COOKIE_SAME_SITE=None` is the
escape hatch, gated by env.ts to require `NODE_ENV=production` (a
`SameSite=None` cookie must also be `Secure`, which `cookies.ts` only
sets in production) — an explicit operator choice, never a silent
default. The **preferred** production setup is still custom
subdomains under one apex domain, keeping `Lax`; `None` exists for
teams that deploy on the platforms' default domains instead. See
`docs/deployment/README.md` for both.

**2. CORS now sets `credentials: true` (`app.ts`), and
`apps/web`'s fetch wrapper sends `credentials: "include"`.** Without
both, `Set-Cookie` on a cross-origin response is silently ignored by
the browser regardless of `SameSite` — the refresh cookie would never
even be _stored_, let alone sent back. This was true even in the
existing local dev setup (`localhost:3000` → `localhost:8787`, still
cross-origin) — `apps/web` had never actually exercised the refresh
cookie end-to-end through a browser before this pass; only the access
token (returned in the JSON body, not cookie-dependent) had been
verified live.

**3. `apps/web` now calls `POST /auth/refresh` at all.** It never did
before — `store/auth-store.ts`'s own doc comment said so explicitly
("no refresh-token handling here yet ... not required for this
milestone's vertical slice"). With a 15-minute access-token TTL and no
refresh path, every session would have silently started failing
requests 15 minutes after login in any real deployment. `lib/api-
client.ts` now retries a 401 exactly once via a coalesced silent
refresh (concurrent 401s share one in-flight `/auth/refresh` call).

**4. `DATABASE_URL` and a non-default `WEB_ORIGIN` are required in
production (`env.ts`, `superRefine`)**, fail-fast at startup, though
both remain optional in development/test. Previously `DATABASE_URL`
being unset meant `app.ts` silently skipped mounting `/auth`,
`/social`, and `/messaging` entirely (logged a `warn`, nothing louder)
while `GET /health` still reported `"ok"` — a misconfigured production
deploy would pass a naive health check while serving zero functional
endpoints. `WEB_ORIGIN` still defaulting to `http://localhost:3000` in
production would silently lock CORS to a dev origin the real frontend
could never call from.

**5. `getClientIp` (`infrastructure/identity/client-ip.ts`) now
trusts the _last_ `x-forwarded-for` entry, not the first.** Every
per-IP rate limiter in this codebase (register/login lockout-adjacent
limits, the new `/auth/ws-ticket` and conversation-creation limits)
keys off this function. The prior version's own comment said to
revisit this "once a reverse proxy is configured" — Railway's edge is
exactly that proxy now. Each hop a request passes through _appends_
its own view of the client IP; the entry closest to this server is the
one the trusted proxy set, every earlier entry is client-supplied and
trivially spoofable. Taking the first entry meant any caller could
defeat every per-IP rate limiter in this codebase simply by sending a
different `x-forwarded-for` value per request. This assumes exactly
one trusted proxy hop (Railway's edge); a second hop (e.g. a CDN in
front of Railway) would need revisiting this.

**6. `/messaging/ws` gained Origin validation, a max payload, a
heartbeat, and graceful shutdown** — see
`docs/security/Messaging.md#websocket-production-hardening` for the
full detail; summarized here because they're deployment-readiness
decisions, not new authentication mechanics (ADR-0030 already covers
the ticket itself).

**7. Rate limiting extended to WS ticket issuance and conversation
creation, and added inside the WS handler for `send_message` volume**
— see `docs/security/Messaging.md#rate-limiting`. Kept in-memory,
single-process, same documented limitation as every other limiter in
this codebase (ADR/TODO already track moving to Redis before
horizontal scaling; not introduced here since nothing about this pass
requires it yet).

## Alternatives Considered

- **Force `SameSite=None` everywhere:** rejected — weakens the default
  for every deployment, including the ones that don't need it (custom
  subdomains under one apex domain). `Lax` stays the default; `None`
  is opt-in and production-only.
- **Move the access token into a cookie too, drop `Authorization`
  headers entirely:** rejected — out of scope (redesigns Identity's
  session strategy, ADR-0024, explicitly forbidden by this task's
  brief) and doesn't actually solve the cross-origin problem any more
  cleanly than fixing CORS/`SameSite` directly.
- **Introduce Redis now for rate limiting/presence:** rejected — the
  task brief explicitly said not to unless the deployment architecture
  genuinely requires it; a single Railway service instance doesn't.
  Remains tracked as a pre-existing, unchanged follow-up.
- **Trust `x-forwarded-for`'s first entry but require it to look like
  an IP:** rejected — validating shape doesn't fix trust; an attacker
  can send a syntactically valid but fake IP just as easily as a
  malformed one. Trusting the correct _position_ (last, proxy-set) is
  the actual fix.

## Consequences

- New env var `COOKIE_SAME_SITE` (default `"Lax"`); every test file
  constructing a literal `ServerEnv` needed one added (mechanical,
  8 files).
- `app.ts`'s CORS middleware and `apps/web`'s fetch wrapper both
  changed to enable credentialed cross-origin requests.
- `apps/web` performs one additional network round trip (`POST
/auth/refresh`) the first time any authenticated call 401s, not on
  every request.
- Production startup now fails fast on missing `DATABASE_URL` or a
  default `WEB_ORIGIN` — a deploy with incomplete configuration no
  longer starts in a silently-broken "degraded but /health says ok"
  state.
- `getClientIp`'s behavior change only matters once a real reverse
  proxy sits in front of `apps/server` (i.e. once actually deployed to
  Railway) — no observable change in local development, where no
  `x-forwarded-for` header is typically present at all.

## Tradeoffs

`COOKIE_SAME_SITE=None` (needed for the platforms' default domains) is
a real, if small, CSRF-surface widening versus `Lax` — accepted
because the only cookie-authenticated endpoint reachable without an
`Authorization` header is `POST /auth/refresh`, which only rotates a
session's own tokens (no data disclosure, no state change useful to
an attacker who can't read the response). `POST /auth/logout` and
`POST /auth/change-credential` both also require a Bearer access
token, which a cross-site attacker page cannot obtain. Preferring
custom subdomains (keeping `Lax`) over `None` remains the documented
recommendation.

## Future Implications

If a CDN or additional reverse proxy is placed in front of Railway's
edge, `getClientIp`'s single-trusted-hop assumption needs revisiting
(count of trusted hops would need to become configurable rather than
hardcoded to "last entry"). If Messaging's rate limiters or presence
registry need to survive multiple `apps/server` instances, they need
the same shared-store migration already tracked for Identity's rate
limiter (TODO.md) — unchanged by this ADR.
