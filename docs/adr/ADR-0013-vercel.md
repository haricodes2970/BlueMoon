# ADR-0013: Vercel for Frontend Hosting

- **Date:** 2026-07-22
- **Status:** Accepted

## Context

The Next.js web client (ADR-0003) needs a deployment target that
supports its rendering modes (SSR, static, edge) with minimal
configuration.

## Decision

Use Vercel to host the Next.js web client.

## Alternatives Considered

- **Railway (same platform as backend, ADR-0012):** rejected for the
  frontend — Vercel's first-party Next.js support (built by the same
  organization) is more complete and lower-friction for framework
  features than a general-purpose PaaS.
- **Self-hosted Node server:** rejected — reintroduces the operational
  overhead the "boring where it doesn't matter" principle is meant to
  avoid at this stage.
- **Cloudflare Pages:** a reasonable alternative, especially given R2
  (ADR-0011) is also Cloudflare; Vercel preferred for tighter,
  lower-friction Next.js-specific integration.

## Consequences

- Near-zero-config deploys for the Next.js client with good defaults for
  its rendering modes.
- Frontend and backend/database now live on two different platforms
  (Vercel and Railway) — deployment/observability tooling must account
  for both rather than a single unified platform.

## Tradeoffs

Splitting frontend and backend hosting across two platforms adds a small
amount of operational surface area, in exchange for each side using the
platform best suited to it rather than a one-size-fits-all compromise.

## Future Implications

If a unified deployment platform becomes preferable (e.g. for
observability or cost consolidation), revisit both ADR-0012 and
ADR-0013 together, since they were chosen as a pair.
