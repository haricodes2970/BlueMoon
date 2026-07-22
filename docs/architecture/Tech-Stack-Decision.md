# Tech Stack Decision

**Status: Draft v1 — authored 2026-07-22, pending review**

This document summarizes BlueMoon's chosen technology stack and why.
Each choice has a full ADR with detailed context, alternatives, and
consequences — this page is the readable index, not a replacement for
those ADRs.

## Summary Table

| Layer | Choice | Why (short) | ADR |
|---|---|---|---|
| Repository structure | Monorepo | Coordinate client/backend/shared types as one unit at current team size | [ADR-0002](../adr/ADR-0002-monorepo.md) |
| Language | TypeScript (strict) | End-to-end type safety across client/backend/shared packages | [ADR-0014](../adr/ADR-0014-typescript.md) |
| Web client framework | Next.js | SSR for shareable PIN-join links + app-like session UI | [ADR-0003](../adr/ADR-0003-nextjs.md) |
| Backend API framework | Hono | Lightweight, fast, multi-runtime, fits a small focused API | [ADR-0004](../adr/ADR-0004-hono.md) |
| Primary database | PostgreSQL | Relational data model fits users/contacts/sessions | [ADR-0005](../adr/ADR-0005-postgresql.md) |
| ORM / query layer | Drizzle | Type-safe, SQL-like, lightweight, pairs with strict TypeScript | [ADR-0006](../adr/ADR-0006-drizzle.md) |
| Styling | Tailwind CSS | Consistent design tokens, fast iteration, calm minimal UI | [ADR-0007](../adr/ADR-0007-tailwind.md) |
| UI component primitives | shadcn/ui | Accessible, copy-into-repo, full control, no black-box dep | [ADR-0008](../adr/ADR-0008-shadcn.md) |
| Client state (local/UI) | Zustand | Minimal API, no boilerplate, clear split from server state | [ADR-0009](../adr/ADR-0009-zustand.md) |
| Client state (server data) | TanStack Query | Caching/loading/error handling for API data | [ADR-0010](../adr/ADR-0010-tanstack-query.md) |
| Object storage | Cloudflare R2 | S3-compatible, no egress fees, keeps media out of Postgres | [ADR-0011](../adr/ADR-0011-cloudflare-r2.md) |
| Backend/DB hosting | Railway | Low-ops PaaS with integrated Postgres provisioning | [ADR-0012](../adr/ADR-0012-railway.md) |
| Frontend hosting | Vercel | First-party Next.js support, near-zero-config deploys | [ADR-0013](../adr/ADR-0013-vercel.md) |

## How These Choices Relate

- **TypeScript (ADR-0014)** is the foundation every other layer builds
  on — Next.js, Hono, and Drizzle were all chosen partly *because* they
  are TypeScript-first, enabling shared types across the monorepo
  (ADR-0002).
- **Next.js (client) + Hono (backend)** are deployed separately —
  Vercel (ADR-0013) for the former, Railway (ADR-0012) for the latter —
  each on the platform best suited to it, per ADR-0013's tradeoff
  discussion.
- **PostgreSQL + Drizzle (ADR-0005, ADR-0006)** handle structured,
  relational, persistent data; **Cloudflare R2 (ADR-0011)** is kept
  separate specifically to avoid bloating the relational store with
  binary media — this mirrors the ephemeral/persistent data separation
  described in
  [Architecture Overview](./Architecture-Overview.md#architectural-principles).
- **Zustand + TanStack Query (ADR-0009, ADR-0010)** split client state
  cleanly: local/UI state vs. server-derived state. This separation is a
  convention, not just a library choice — see each ADR's consequences.
- **Tailwind + shadcn (ADR-0007, ADR-0008)** together form the UI layer:
  Tailwind provides the design tokens, shadcn provides accessible
  components built on those tokens.

## Alternatives Considered (see individual ADRs for full detail)

Every layer had at least one seriously considered alternative — Express
over Hono, Prisma over Drizzle, MUI/Chakra over shadcn, Redux over
Zustand, SWR/Apollo over TanStack Query, S3/GCS over R2, self-hosted
infra over Railway/Vercel. None were dismissed casually; each ADR
documents why the chosen option fit BlueMoon's current stage and
principles better.

## Guiding Constraint

Every choice here was evaluated against
[Architecture Overview](./Architecture-Overview.md#architectural-principles) —
particularly "boring where it doesn't matter, careful where it does."
The stack favors low operational overhead and small-team velocity today,
with explicit "future implications" notes in each ADR for when that
tradeoff should be revisited.

## Related Documents

- [Architecture Overview](./Architecture-Overview.md)
- [ADR log](../adr/README.md)
- [Engineering Coding Standards](../engineering/coding-standards.md)
