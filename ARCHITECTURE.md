# ARCHITECTURE.md — System Overview

High-level entry point for how BlueMoon is built. Full detail lives
under [`docs/architecture`](./docs/architecture) and
[`docs/adr`](./docs/adr) — this file is a map, not a duplicate.

## Principles

Session/PIN as the unit of access, not account · privacy by default ·
ephemeral-first data lifecycle · platform, not app · boring where it
doesn't matter, careful where it does.

Full detail: [Architecture Overview](./docs/architecture/Architecture-Overview.md#architectural-principles)

## System Boundaries

Client applications · Session/Identity boundary · Messaging/transport
boundary · Storage boundary (ephemeral vs. persisted, kept structurally
separate) · Platform edge (API surface for future products).

Full detail: [Architecture Overview](./docs/architecture/Architecture-Overview.md#system-boundaries)

## Stack (see DECISIONS.md for the ADR behind each)

| Layer | Choice |
|---|---|
| Repo structure | Monorepo |
| Language | TypeScript (strict) |
| Web client | Next.js |
| Backend API | Hono |
| Database | PostgreSQL + Drizzle |
| Styling / components | Tailwind + shadcn/ui |
| Client state | Zustand (local) + TanStack Query (server) |
| Object storage | Cloudflare R2 |
| Hosting | Railway (backend/DB) + Vercel (frontend) |

Full detail: [Tech-Stack-Decision.md](./docs/architecture/Tech-Stack-Decision.md)

## Future Modules (anticipated, not committed)

Presence/real-time signaling · notification service · media handling ·
contact/relationship service · future BlueMoon products beyond PINChat.

Full detail: [Architecture Overview](./docs/architecture/Architecture-Overview.md#future-modules-anticipated-not-committed)

## Area-Specific Docs

`docs/backend`, `docs/frontend`, `docs/api`, `docs/database`,
`docs/deployment`, `docs/security` — index stubs today, populated as
each area is implemented (see [ROADMAP.md](./ROADMAP.md)).

## Status

Architecture direction only — no implementation exists yet. Draft v1,
pending founder review.

## See Also

- [BLUEPRINT.md](./BLUEPRINT.md) — the product intent this architecture serves
- [DECISIONS.md](./DECISIONS.md) — full ADR index
- [ROADMAP.md](./ROADMAP.md) — milestone status
