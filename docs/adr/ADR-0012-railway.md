# ADR-0012: Railway for Backend/Database Hosting

- **Date:** 2026-07-22
- **Status:** Accepted

## Context

The Hono backend (ADR-0004) and PostgreSQL database (ADR-0005) need a
hosting platform for early-stage deployment that minimizes
infrastructure/ops overhead while the team is small.

## Decision

Use Railway to host the backend API service and PostgreSQL database.

## Alternatives Considered

- **Self-managed cloud infrastructure (raw AWS/GCP/Azure VMs or
  Kubernetes):** rejected for this stage — operational overhead is
  disproportionate to current team size and product maturity; conflicts
  with "boring where it doesn't matter" in
  [Architecture Overview](../architecture/Architecture-Overview.md#design-philosophy).
- **Render / Fly.io:** reasonable comparable PaaS alternatives; Railway
  chosen for its integrated Postgres provisioning and straightforward
  deploy workflow, reducing the number of separate services to
  configure.
- **Vercel for backend too:** rejected — Vercel (ADR-0013) is used for
  the Next.js frontend; running the stateful backend/database there
  would fight its serverless-first, frontend-optimized model.

## Consequences

- Fast path to a deployed backend + database with minimal DevOps setup.
- Ties early infrastructure to Railway's platform constraints and
  pricing model.

## Tradeoffs

Trades some control and potential cost efficiency at scale for
significantly reduced operational burden today. Acceptable while the
team is small and iteration speed matters more than infrastructure
optimization.

## Future Implications

If BlueMoon's traffic or compliance requirements outgrow Railway's
model, migrating the backend/database to a different provider is a
future ADR — the Hono/PostgreSQL choices (ADR-0004, ADR-0005) are
intentionally decoupled from Railway specifically to keep that path
open.
